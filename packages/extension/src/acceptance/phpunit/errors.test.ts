import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type ExtensionContext, type TestItem, Uri } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { activateExtension } from '../harness';
import { stubs } from '../support';

const phpunitXml = `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="default">
            <directory>tests</directory>
        </testsuite>
    </testsuites>
</phpunit>
`;

const kindsTest = `<?php

namespace App\\Tests;

use PHPUnit\\Framework\\TestCase;

class DomainFailure extends \\RuntimeException {}

class KindsTest extends TestCase
{
    public function test_fails(): void
    {
        $this->assertSame(1, 2);
    }

    public function test_fails_with_message(): void
    {
        $this->assertTrue(false, 'Config: missing key');
    }

    public function test_fail_call(): void
    {
        $this->fail('plain reason');
    }

    public function test_throws(): void
    {
        throw new \\RuntimeException('boom');
    }

    public function test_throws_namespaced(): void
    {
        throw new DomainFailure('bad state');
    }

    public function test_php_error(): void
    {
        $value = null;
        $value->method();
    }
}
`;

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary }) => {
    let tmp: string;
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        tmp = Uri.file(await realpath(await mkdtemp(join(tmpdir(), 'vscode-phpunit-')))).fsPath;
        context = createExtensionContext();
        await mkdir(join(tmp, 'tests'), { recursive: true });
        await writeFile(join(tmp, 'phpunit.xml'), phpunitXml);
        await writeFile(join(tmp, 'tests/KindsTest.php'), kindsTest);
        await openWorkspace({ root: tmp, settings: { php: 'php', phpunit: join(root, binary) } });
    });
    afterEach(async () => {
        vi.clearAllMocks();
        await rm(tmp, { recursive: true, force: true });
    });

    describe('errors and failures', () => {
        it('reports a thrown exception or PHP error as errored and a failed assertion as failed', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();

            await extension.run();

            const ids = (fn: unknown) =>
                (fn as Mock).mock.calls.map(([item]) => (item as TestItem).id).sort();
            const [testRun] = extension.testRuns();
            expect(ids(testRun.errored)).toEqual([
                'Kinds (App\\Tests\\Kinds)::Php error',
                'Kinds (App\\Tests\\Kinds)::Throws',
                'Kinds (App\\Tests\\Kinds)::Throws namespaced',
            ]);
            expect(ids(testRun.failed)).toEqual(
                expect.arrayContaining([
                    'Kinds (App\\Tests\\Kinds)::Fail call',
                    'Kinds (App\\Tests\\Kinds)::Fails',
                    'Kinds (App\\Tests\\Kinds)::Fails with message',
                ]),
            );
        });
    });
});
