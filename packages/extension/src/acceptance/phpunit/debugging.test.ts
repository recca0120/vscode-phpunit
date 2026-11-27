import { spawn } from 'node:child_process';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { debug, type ExtensionContext, TestRunProfileKind, Uri, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { expectSpawned } from '../../../test-support/process';
import { activateAndRun, phpUnitSettings, stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
    });
    afterEach(() => vi.clearAllMocks());

    describe('debugging', () => {
        it('debugs with Xdebug on a free port and stops the debug session afterwards', async () => {
            await activateAndRun(context, { kind: TestRunProfileKind.Debug });

            expectSpawned({
                cwd: root,
                args: [
                    '-dxdebug.mode=debug',
                    '-dxdebug.start_with_request=1',
                    /-dxdebug\.client_port=\d+/,
                    binary,
                    '--colors=always',
                    '--teamcity',
                ],
                env: { XDEBUG_MODE: 'debug' },
            });

            expect(debug.startDebugging).toHaveBeenCalledWith(expect.anything(), {
                type: 'php',
                request: 'launch',
                name: 'PHPUnit',
                port: expect.any(Number),
            });
            expect(debug.stopDebugging).toHaveBeenCalledWith({ type: 'php' });
        });

        it('uses the port of the launch configuration named by debuggerConfig', async () => {
            const folderUri = Uri.file(root);
            await workspace.getConfiguration('launch', folderUri).update('configurations', [
                {
                    name: 'Listen for Xdebug',
                    type: 'php',
                    request: 'launch',
                    port: 9003,
                },
            ]);
            const configuration = workspace.getConfiguration('phpunit', folderUri);
            await configuration.update('debuggerConfig', 'Listen for Xdebug');

            try {
                await activateAndRun(context, { kind: TestRunProfileKind.Debug });

                expectSpawned({
                    cwd: root,
                    args: [
                        '-dxdebug.mode=debug',
                        '-dxdebug.start_with_request=1',
                        '-dxdebug.client_port=9003',
                        binary,
                        '--colors=always',
                        '--teamcity',
                    ],
                    env: { XDEBUG_MODE: 'debug' },
                });
                expect(debug.startDebugging).toHaveBeenCalledWith(
                    expect.anything(),
                    'Listen for Xdebug',
                );
            } finally {
                await configuration.update('debuggerConfig', undefined);
            }
        });

        it('leaves the client port to Xdebug when the named launch configuration has none', async () => {
            const folderUri = Uri.file(root);
            await workspace
                .getConfiguration('launch', folderUri)
                .update('configurations', [
                    { name: 'Listen for Xdebug', type: 'php', request: 'launch' },
                ]);
            const configuration = workspace.getConfiguration('phpunit', folderUri);
            await configuration.update('debuggerConfig', 'Listen for Xdebug');

            try {
                await activateAndRun(context, { kind: TestRunProfileKind.Debug });

                const [, args] = (spawn as Mock).mock.calls[0];
                expect(args).toEqual(
                    expect.arrayContaining([
                        '-dxdebug.mode=debug',
                        '-dxdebug.start_with_request=1',
                    ]),
                );
                expect(
                    args.filter((arg: string) => arg.startsWith('-dxdebug.client_port')),
                ).toEqual([]);
            } finally {
                await configuration.update('debuggerConfig', undefined);
            }
        });
    });
});
