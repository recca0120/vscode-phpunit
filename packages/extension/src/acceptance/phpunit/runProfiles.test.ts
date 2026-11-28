import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ExtensionContext, TestRunProfileKind } from 'vscode';
import { executedCommands } from '../../../fakes/executedCommands';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { activateExtension } from '../harness';
import { stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    describe('run profiles', () => {
        it.each([
            ['Run', TestRunProfileKind.Run],
            ['Coverage', TestRunProfileKind.Coverage],
        ])('opens the PHPUnit settings when the %s profile is configured', async (_name, kind) => {
            const extension = await activateExtension(context);

            extension.profile(kind).configureHandler?.();

            expect(executedCommands()).toContainEqual([
                'workbench.action.openSettings',
                ['@ext:recca0120.vscode-phpunit'],
            ]);
        });
    });
});
