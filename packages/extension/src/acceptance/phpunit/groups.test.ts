import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { commands, type ExtensionContext, Uri, window, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace, setActiveTextEditor } from '../../../fakes/openWorkspace';
import { expectSpawned } from '../../../test-support/process';
import { activateExtension } from '../harness';
import { activateAndRun, methodFilter, stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
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

        it('phpunit.run-by-group runs the group picked from the list', async () => {
            const _ext = await activateExtension(context);
            (window.showQuickPick as Mock).mockResolvedValue('integration');

            await commands.executeCommand('phpunit.run-by-group');

            expect(window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining(['integration']),
                expect.objectContaining({
                    placeHolder: 'Select a PHPUnit group to run',
                }),
            );

            expectSpawned({ cwd: root, args: [binary, '--colors=always', '--teamcity'] });
        });

        it('runs a class with a group by that group', async () => {
            await activateAndRun(context, { include: 'Attribute (Tests\\Attribute)' });

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    '--group=integration',
                    Uri.file(phpUnitProject('tests/AttributeTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                ],
            });
        });

        it('runs a method with a group by its name', async () => {
            await activateAndRun(context, { include: 'Assertions (Tests\\Assertions)::Passed' });

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    methodFilter('test_passed'),
                    Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                ],
            });
        });

        it('runs the method with a group under the cursor by its name', async () => {
            const _ext = await activateExtension(context);
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 17,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    methodFilter('test_passed'),
                    Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                ],
            });
        });
    });
});
