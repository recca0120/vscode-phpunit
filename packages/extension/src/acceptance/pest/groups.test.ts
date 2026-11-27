import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';
import { type ExtensionContext, Uri, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { expectSpawned } from '../../../test-support/process';
import { activateAndRun, stubs } from '../support';

describe.each(stubs.pest)('Pest $name ($pestVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    describe('groups', () => {
        it('passes --group from the phpunit.args setting', async () => {
            const configuration = workspace.getConfiguration('phpunit', Uri.file(root));
            await configuration.update('args', ['--group=integration']);

            await activateAndRun(context);

            expectSpawned({
                cwd: root,
                args: [binary, '--group=integration', '--colors=always', '--teamcity'],
            });

            await configuration.update('args', []);
        });
    });
});
