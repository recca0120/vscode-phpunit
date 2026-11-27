import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';
import { commands, type ExtensionContext, Uri } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace, setActiveTextEditor } from '../../../fakes/openWorkspace';
import { phpUnitFixture } from '../../../test-support/fixtures';
import { expectSpawned } from '../../../test-support/process';
import { activateExtension } from '../harness';
import { methodFilter, phpUnitSettings, stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
    });
    afterEach(() => vi.clearAllMocks());

    describe('commands', () => {
        it('phpunit.run-all runs all tests', async () => {
            const _ext = await activateExtension(context);

            await commands.executeCommand('phpunit.run-all');

            expectSpawned({ cwd: root, args: [binary, '--colors=always', '--teamcity'] });
        });

        it('phpunit.run-file runs the file of the active editor', async () => {
            setActiveTextEditor(phpUnitFixture.assertionsTest);
            const _ext = await activateExtension(context);

            await commands.executeCommand('phpunit.run-file');

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                ],
            });
        });

        it('phpunit.run-test-at-cursor runs the test method under the cursor', async () => {
            const _ext = await activateExtension(context);
            setActiveTextEditor(phpUnitFixture.assertionsTest, phpUnitFixture.cursorInTestPassed);

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
