import { join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type ExtensionContext, Uri, window, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { activateAndRun, stubs } from '../support';

describe.each(stubs.pest)('Pest $name ($pestVersion)', ({ name, root, binary }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({
            root,
            settings: {
                php: 'php',
                phpunit: binary.replace(/pest$/, 'phpunit'),
                args: ['-c', join(root, `${name}/phpunit.xml`)],
            },
        });
    });
    afterEach(() => vi.clearAllMocks());

    describe('running a Pest project with the PHPUnit binary', () => {
        it('offers to switch phpunit.phpunit to vendor/bin/pest and switches on Yes', async () => {
            (window.showWarningMessage as Mock).mockResolvedValue('Yes');

            await activateAndRun(context);

            expect(window.showWarningMessage).toHaveBeenCalledWith(
                'Update "phpunit.phpunit" to vendor/bin/pest ?',
                expect.anything(),
                'Yes',
            );
            expect(workspace.getConfiguration('phpunit', Uri.file(root)).get('phpunit')).toEqual(
                'vendor/bin/pest',
            );
        });
    });
});
