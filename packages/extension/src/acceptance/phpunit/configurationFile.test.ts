import { mkdir, mkdtemp, realpath, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { initTreeSitter, VAR_WORKSPACE_FOLDER } from '@vscode-phpunit/phpunit';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    type Mock,
    onTestFinished,
    vi,
} from 'vitest';
import type { ExtensionContext, TestItem } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { fireFileEvent } from '../../../fakes/fileSystemWatchers';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { allIds, filesOf } from '../../../test-support/testItems';
import { activateExtension } from '../harness';
import { stubs } from '../support';

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

const baseCase = `<?php

namespace Base;

use PHPUnit\\Framework\\TestCase;

abstract class BaseCase extends TestCase
{
    public function test_inherited(): void
    {
        $this->assertTrue(true);
    }
}
`;

const childTest = `<?php

class ChildTest extends Base\\BaseCase
{
    public function test_own(): void
    {
        $this->assertTrue(true);
    }
}
`;

const autoloadDev = `{
    "autoload-dev": {
        "psr-4": {
            "Base\\\\": "lib/"
        }
    }
}
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

const testCaseWithSecond = (name: string) => `<?php

use PHPUnit\\Framework\\TestCase;

class ${name} extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }

    public function test_second(): void
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

    const createFile = async (file: string, content: string) => {
        await writeFiles({ [file]: content });
        fireFileEvent('create', join(tmp, file));
    };

    const changeFile = async (file: string, content: string) => {
        await writeFile(join(tmp, file), content);
        fireFileEvent('change', join(tmp, file));
    };

    const deleteFile = async (file: string) => {
        await unlink(join(tmp, file));
        fireFileEvent('delete', join(tmp, file));
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

    describe('reloading the tests when the configuration file is created, deleted or changed', () => {
        it('reloads when phpunit.xml is created', async () => {
            await writeFiles({
                'a/ATest.php': testCase('ATest'),
                'b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(filesOf(items).sort()).toEqual([
                join(tmp, 'a/ATest.php'),
                join(tmp, 'b/BTest.php'),
            ]);

            await createFile('phpunit.xml', testsuite('a'));

            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'a/ATest.php')]));
        });

        it.each([
            ['an absolute path', (root: string) => join(root, 'phpunit.custom.xml')],
            [VAR_WORKSPACE_FOLDER, () => `${VAR_WORKSPACE_FOLDER}/phpunit.custom.xml`],
        ])('reloads when the file given with -c as %s changes', async (_, configurationFile) => {
            await writeFiles({
                'phpunit.custom.xml': testsuite('a'),
                'a/ATest.php': testCase('ATest'),
                'b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({
                root: tmp,
                settings: { php: 'php', args: ['-c', configurationFile(tmp)] },
            });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(filesOf(items)).toEqual([join(tmp, 'a/ATest.php')]);

            await changeFile('phpunit.custom.xml', testsuite('b'));

            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'b/BTest.php')]));
        });

        it('reloads when the file given with -c outside the workspace folder changes', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('proj/a'),
                'proj/a/ATest.php': testCase('ATest'),
                'proj/b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({
                root: join(tmp, 'proj'),
                settings: { php: 'php', args: ['-c', '../phpunit.xml'] },
            });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(filesOf(items)).toEqual([join(tmp, 'proj/a/ATest.php')]);

            await changeFile('phpunit.xml', testsuite('proj/b'));

            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'proj/b/BTest.php')]));
        });

        it('lists the tests as a start without phpunit.xml does once phpunit.xml is deleted', async () => {
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

            await deleteFile('phpunit.xml');

            await vi.waitFor(() =>
                expect(filesOf(items).sort()).toEqual([
                    join(tmp, 'a/ATest.php'),
                    join(tmp, 'b/BTest.php'),
                ]),
            );
        });

        it('reloads when composer.json changes', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'composer.json': '{}\n',
                'lib/BaseCase.php': baseCase,
                'tests/ChildTest.php': childTest,
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(allIds(items)).toEqual(['Child', 'Child::Own']);

            await changeFile('composer.json', autoloadDev);

            await vi.waitFor(() =>
                expect(allIds(items)).toEqual(['Child', 'Child::Own', 'Child::Inherited']),
            );
        });

        it('reloads when composer.json is deleted', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'composer.json': autoloadDev,
                'lib/BaseCase.php': baseCase,
                'tests/ChildTest.php': childTest,
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(allIds(items)).toEqual(['Child', 'Child::Own', 'Child::Inherited']);

            await deleteFile('composer.json');

            await vi.waitFor(() => expect(allIds(items)).toEqual(['Child', 'Child::Own']));
        });

        it('watches the test files of the new testsuite directory after a reload', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('a'),
                'a/ATest.php': testCase('ATest'),
                'b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            await changeFile('phpunit.xml', testsuite('b'));
            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'b/BTest.php')]));

            await createFile('b/CTest.php', testCase('CTest'));

            await vi.waitFor(() =>
                expect(filesOf(items)).toEqual([
                    join(tmp, 'b/BTest.php'),
                    join(tmp, 'b/CTest.php'),
                ]),
            );
        });

        it('reloads once the configuration files stop changing', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('a'),
                'composer.lock': '{}',
                'a/ATest.php': testCase('ATest'),
                'b/BTest.php': testCase('BTest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
            onTestFinished(() => {
                vi.useRealTimers();
            });

            await changeFile('phpunit.xml', testsuite('b'));
            await vi.advanceTimersByTimeAsync(300);
            await changeFile('composer.lock', '{}');
            await vi.advanceTimersByTimeAsync(499);
            expect(filesOf(items)).toEqual([join(tmp, 'a/ATest.php')]);

            await vi.advanceTimersByTimeAsync(1);
            vi.useRealTimers();
            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'b/BTest.php')]));
        });
    });

    describe('creating and deleting test files', () => {
        it('adds the tests of a created test file', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'tests/ATest.php': testCase('ATest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;

            await createFile('tests/BTest.php', testCase('BTest'));

            await vi.waitFor(() =>
                expect(filesOf(items)).toEqual([
                    join(tmp, 'tests/ATest.php'),
                    join(tmp, 'tests/BTest.php'),
                ]),
            );
        });

        it('removes the tests of a deleted test file', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'tests/ATest.php': testCase('ATest'),
                'tests/BTest.php': testCase('BTest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;

            await deleteFile('tests/BTest.php');

            await vi.waitFor(() => expect(filesOf(items)).toEqual([join(tmp, 'tests/ATest.php')]));
        });

        it('re-parses a listed test file that is reported as created', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'tests/ATest.php': testCase('ATest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php' } });
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            expect(allIds(items)).toEqual(['A', 'A::It works']);

            await createFile('tests/ATest.php', testCaseWithSecond('ATest'));

            await vi.waitFor(() =>
                expect(allIds(items)).toEqual(['A', 'A::It works', 'A::Second']),
            );
        });
    });

    describe('continuous runs', () => {
        const [phpUnitStub] = stubs.phpUnit;
        const phpunit = join(phpUnitStub.root, phpUnitStub.binary);

        it('reruns when a test file is created during a continuous run of everything', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'tests/ATest.php': testCase('ATest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php', phpunit } });
            const extension = await activateExtension(context);
            await extension.resolve();
            await extension.run(undefined, { continuous: true });

            await createFile('tests/BTest.php', testCase('BTest'));

            await vi.waitFor(
                () => {
                    expect(extension.testRuns()).toHaveLength(1);
                    expect(extension.testRuns()[0].end).toHaveBeenCalled();
                },
                { timeout: 10_000 },
            );
        });

        it('marks the tests of a file created during a continuous run of everything', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'tests/ATest.php': testCase('ATest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php', phpunit } });
            const extension = await activateExtension(context);
            await extension.resolve();
            await extension.run(undefined, { continuous: true });

            await createFile('tests/BTest.php', testCase('BTest'));

            await vi.waitFor(
                () => {
                    const [testRun] = extension.testRuns();
                    expect(testRun.end).toHaveBeenCalled();
                    const passed = (testRun.passed as Mock).mock.calls.map(
                        ([item]) => (item as TestItem).id,
                    );
                    expect(passed).toEqual(expect.arrayContaining(['A::It works', 'B::It works']));
                },
                { timeout: 10_000 },
            );
        });

        it('marks a method added to a test file during a continuous run of everything', async () => {
            await writeFiles({
                'phpunit.xml': testsuite('tests'),
                'tests/ATest.php': testCase('ATest'),
            });
            await openWorkspace({ root: tmp, settings: { php: 'php', phpunit } });
            const extension = await activateExtension(context);
            await extension.resolve();
            await extension.run(undefined, { continuous: true });

            await changeFile('tests/ATest.php', testCaseWithSecond('ATest'));

            await vi.waitFor(
                () => {
                    const [testRun] = extension.testRuns();
                    expect(testRun.end).toHaveBeenCalled();
                    const passed = (testRun.passed as Mock).mock.calls.map(
                        ([item]) => (item as TestItem).id,
                    );
                    expect(passed).toEqual(expect.arrayContaining(['A::It works', 'A::Second']));
                },
                { timeout: 10_000 },
            );
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
