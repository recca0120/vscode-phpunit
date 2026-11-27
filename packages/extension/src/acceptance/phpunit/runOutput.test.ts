import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ExtensionContext } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { activateAndRun, stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    describe('test run output', () => {
        it('writes the failure PHPUnit reports to the test run output', async () => {
            const extension = await activateAndRun(context, {
                include: 'Assertions (Tests\\Assertions)::Failed',
            });

            const output = (extension.testRuns()[0].appendOutput as Mock).mock.calls
                .map(([text]) => text)
                .join('');
            expect(output).toContain('Failed asserting that false is true.');
        });
    });
});
