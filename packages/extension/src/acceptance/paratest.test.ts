import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, type ExtensionContext, Uri, window } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace, setActiveTextEditor } from '../../fakes/openWorkspace';
import { phpUnitFixture } from '../../test-support/fixtures';
import { expectSpawned } from '../../test-support/process';
import { activateExtension } from './harness';
import { expectTestResultCalled, methodFilter, phpUnitSettings, stubs } from './support';

let context: ExtensionContext;

beforeAll(async () => initTreeSitter());

beforeEach(() => {
    context = createExtensionContext();
});

describe.each(stubs.paratest)('Paratest $name', ({ root, binary, args }) => {
    beforeEach(async () => {
        await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
        window.showErrorMessage = vi.fn();
    });

    afterEach(() => vi.clearAllMocks());

    it('runs the test method under the cursor with --functional', async () => {
        const extension = await activateExtension(context);
        setActiveTextEditor(phpUnitFixture.assertionsTest, phpUnitFixture.cursorInTestPassed);

        await commands.executeCommand('phpunit.run-test-at-cursor');

        const method = 'test_passed';

        expectSpawned({
            cwd: root,
            args: [
                binary,
                methodFilter(method),
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                '--colors=always',
                '--teamcity',
                '--functional',
            ],
        });

        expect(window.showErrorMessage).not.toHaveBeenCalled();

        expectTestResultCalled(extension, {
            enqueued: 1,
            started: 1,
            passed: 1,
            failed: 0,
            end: 1,
        });
    });
});
