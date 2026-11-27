import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type ExtensionContext, type TestItem, Uri, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { allIds, filesOf } from '../../../test-support/testItems';
import { activateExtension } from '../harness';
import { stubs } from '../support';

type FileEvents = { fireFileEvent: (event: 'change', uri: Uri) => void };

const testsuite = (directory: string) => `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="default">
            <directory>${directory}</directory>
        </testsuite>
    </testsuites>
</phpunit>
`;

const suffixedTestsuite = `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="default">
            <directory suffix="Test.php">tests</directory>
        </testsuite>
    </testsuites>
</phpunit>
`;

const greetingTest = `<?php

require_once __DIR__.'/Concerns/Greets.php';

use PHPUnit\\Framework\\TestCase;

class GreetingTest extends TestCase
{
    use Greets;
}
`;

const greetsTrait = (...methods: string[]) => `<?php

trait Greets
{
${methods
    .map(
        (method) => `    public function ${method}(): void
    {
        $this->assertTrue(true);
    }
`,
    )
    .join('\n')}}
`;

const testCase = (name: string) => `<?php

use PHPUnit\\Framework\\TestCase;

class ${name} extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }
}
`;

describe('phpunit.xml and the files it points to', () => {
    let tmp: string;
    let context: ExtensionContext;

    const writeFiles = async (files: Record<string, string>) => {
        for (const [file, content] of Object.entries(files)) {
            await mkdir(dirname(join(tmp, file)), { recursive: true });
            await writeFile(join(tmp, file), content);
        }
    };

    const changeFile = async (file: string, content: string) => {
        await writeFile(join(tmp, file), content);
        (workspace as unknown as FileEvents).fireFileEvent('change', Uri.file(join(tmp, file)));
    };

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        tmp = await realpath(await mkdtemp(join(tmpdir(), 'vscode-phpunit-')));
        context = createExtensionContext();
    });
    afterEach(async () => {
        vi.clearAllMocks();
        await rm(tmp, { recursive: true, force: true });
    });

    describe('reloading the tests when the configuration file changes', () => {
        it('reloads when phpunit.xml changes', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('a'),
                'a/ATest.php': testCase('ATest'),
                'b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(filesOf(items)).toEqual([join(tmp, 'a/ATest.php')]);

            await changeFile('phpunit.xml', testsuite('b'));

            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'b/BTest.php')]));
        });

        it('reloads when the file given with -c changes', async () => {
            await writeFiles({
                'phpunit.custom.xml': testsuite('a'),
                'a/ATest.php': testCase('ATest'),
                'b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({
                root: tmp,
                settings: { php: 'php', args: ['-c', 'phpunit.custom.xml'] },
            });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(filesOf(items)).toEqual([join(tmp, 'a/ATest.php')]);

            await changeFile('phpunit.custom.xml', testsuite('b'));

            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'b/BTest.php')]));
        });
    });

    describe('a configuration file outside the workspace folder', () => {
        it('lists only the tests inside the folder, not those of a sibling sharing its prefix', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('.'),
                'proj/tests/ATest.php': testCase('ATest'),
                'project2/tests/BTest.php': testCase('BTest'),
            });
            await openWorkspace({
                root: join(tmp, 'proj'),
                settings: { php: 'php', args: ['-c', '../phpunit.xml'] },
            });
            const extension = await activateExtension(context);
            await extension.resolve();

            expect(filesOf(extension.controller.items)).toEqual([
                join(tmp, 'proj/tests/ATest.php'),
            ]);
        });
    });

    describe.each(stubs.phpUnit)(
        'a testsuite directory with a suffix on PHPUnit $name',
        ({ root, binary }) => {
            it('updates and runs the tests a class takes from a trait file without the suffix', async () => {
                await writeFiles({
                    'phpunit.xml': suffixedTestsuite,
                    'tests/GreetingTest.php': greetingTest,
                    'tests/Concerns/Greets.php': greetsTrait('test_greets'),
                });
                await openWorkspace({
                    root: tmp,
                    settings: { php: 'php', phpunit: join(root, binary) },
                });
                const extension = await activateExtension(context);
                await extension.resolve();
                const { items } = extension.controller;
                expect(allIds(items)).toEqual(['Greeting', 'Greeting::Greets']);

                await changeFile(
                    'tests/Concerns/Greets.php',
                    greetsTrait('test_greets', 'test_waves'),
                );
                await vi.waitFor(() =>
                    expect(allIds(items)).toEqual([
                        'Greeting',
                        'Greeting::Greets',
                        'Greeting::Waves',
                    ]),
                );
                await extension.run();

                const passed = (extension.testRuns()[0].passed as Mock).mock.calls.map(
                    ([item]) => (item as TestItem).id,
                );
                expect(passed).toEqual(
                    expect.arrayContaining(['Greeting::Greets', 'Greeting::Waves']),
                );
            });
        },
    );
});
