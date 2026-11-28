import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionContext } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { editTextDocument } from '../../../fakes/vscodeEvents';
import { allIds } from '../../../test-support/testItems';
import { activateExtension } from '../harness';

const phpunitXml = `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="default">
            <directory>tests</directory>
        </testsuite>
    </testsuites>
</phpunit>
`;

const savedTest = `<?php

use PHPUnit\\Framework\\TestCase;

class ATest extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }
}
`;

const typedTest = `<?php

use PHPUnit\\Framework\\TestCase;

class ATest extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }

    public function test_typed(): void
    {
        $this->assertTrue(true);
    }
}
`;

describe('editing a test file', () => {
    let tmp: string;
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        tmp = await realpath(await mkdtemp(join(tmpdir(), 'vscode-phpunit-')));
        context = createExtensionContext();
        for (const [file, content] of Object.entries({
            'phpunit.xml': phpunitXml,
            'tests/ATest.php': savedTest,
        })) {
            await mkdir(dirname(join(tmp, file)), { recursive: true });
            await writeFile(join(tmp, file), content);
        }
        await openWorkspace({ root: tmp, settings: { php: 'php' } });
    });
    afterEach(async () => {
        vi.useRealTimers();
        vi.clearAllMocks();
        await rm(tmp, { recursive: true, force: true });
    });

    it('lists a test method typed in the editor before the file is saved', async () => {
        const extension = await activateExtension(context);
        await extension.resolve();
        const { items } = extension.controller;
        expect(allIds(items)).toEqual(['A', 'A::It works']);

        await editTextDocument(join(tmp, 'tests/ATest.php'), typedTest);

        await vi.waitFor(() => expect(allIds(items)).toEqual(['A', 'A::It works', 'A::Typed']));
    });

    it('parses the editor text only once typing pauses', async () => {
        const extension = await activateExtension(context);
        await extension.resolve();
        const { items } = extension.controller;
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        await editTextDocument(join(tmp, 'tests/ATest.php'), typedTest);
        await vi.advanceTimersByTimeAsync(299);
        expect(allIds(items)).toEqual(['A', 'A::It works']);

        await vi.advanceTimersByTimeAsync(1);
        await vi.waitFor(() => expect(allIds(items)).toEqual(['A', 'A::It works', 'A::Typed']));
    });
});
