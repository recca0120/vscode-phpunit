import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type ExtensionContext, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { Configuration } from '../../Configuration';
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

    describe('settings', () => {
        it('reloads the configuration only when a phpunit setting changes', async () => {
            const _ext = await activateExtension(context);

            const onDidChangeConfig = workspace.onDidChangeConfiguration as Mock;
            const listenerCall = onDidChangeConfig.mock.calls.find(
                (call: unknown[]) => typeof call[0] === 'function',
            );
            expect(listenerCall).toBeDefined();
            const listener = listenerCall?.[0];

            const spy = vi.spyOn(Configuration.prototype, 'updateWorkspaceConfiguration');

            listener({ affectsConfiguration: (section: string) => section === 'phpunit' });
            expect(spy).toHaveBeenCalledTimes(1);

            spy.mockClear();

            listener({ affectsConfiguration: (section: string) => section === 'editor' });
            expect(spy).not.toHaveBeenCalled();

            spy.mockRestore();
        });
    });
});
