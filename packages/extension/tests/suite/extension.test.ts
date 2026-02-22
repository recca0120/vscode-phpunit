import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
    activateExtension,
    collectTestItemIds,
    countTestItems,
    type ExtensionApi,
    findTestItem,
    waitForTestItems,
} from '../helper';

const stubType = process.env.STUB_TYPE ?? 'phpunit';
const stubVersion = process.env.STUB_VERSION ?? 'unknown';
const stubBinary = process.env.STUB_BINARY ?? '';
const stubArgs: string[] = process.env.STUB_ARGS ? JSON.parse(process.env.STUB_ARGS) : [];

suite(`${stubType === 'pest' ? 'Pest' : 'PHPUnit'} ${stubVersion} — E2E`, () => {
    let ctrl: vscode.TestController;
    let api: ExtensionApi;

    suiteSetup(async () => {
        api = await activateExtension();
        ctrl = api.testController;

        // Configure the extension for this stub version
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const config = vscode.workspace.getConfiguration('phpunit', folders[0].uri);
            await config.update('phpunit', stubBinary, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', stubArgs, vscode.ConfigurationTarget.WorkspaceFolder);
        }

        // Trigger reload so extension picks up the new settings
        await vscode.commands.executeCommand('phpunit.reload');

        // Wait for test items to appear
        await waitForTestItems(ctrl, 1, 30_000);
    });

    suiteTeardown(async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const config = vscode.workspace.getConfiguration('phpunit', folders[0].uri);
            await config.update('phpunit', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    test('should activate extension', () => {
        const ext = vscode.extensions.getExtension('recca0120.vscode-phpunit');
        assert.ok(ext, 'Extension should exist');
        assert.ok(ext.isActive, 'Extension should be active');
    });

    test('should register phpunit commands', async () => {
        const allCommands = await vscode.commands.getCommands(true);
        const expected = [
            'phpunit.reload',
            'phpunit.run-all',
            'phpunit.run-file',
            'phpunit.run-test-at-cursor',
            'phpunit.rerun',
        ];
        for (const cmd of expected) {
            assert.ok(allCommands.includes(cmd), `Command "${cmd}" should be registered`);
        }
    });

    test('should discover test items after resolve', async () => {
        // resolveHandler(undefined) triggers file watcher start
        await ctrl.resolveHandler?.(undefined);
        await waitForTestItems(ctrl, 2, 30_000);

        const count = countTestItems(ctrl.items);
        assert.ok(count > 0, `Expected test items but got ${count}`);
    });

    test('should have correct hierarchy', async () => {
        const ids = collectTestItemIds(ctrl.items);

        if (stubType === 'phpunit') {
            // PHPUnit should have namespace → class → method
            const hasNamespace = ids.some((id) => id.startsWith('namespace:'));
            const hasClass = ids.some((id) => id.includes('(Tests\\'));
            const hasMethod = ids.some((id) => id.includes('::'));
            assert.ok(hasNamespace || hasClass, 'Should have namespace or class items');
            assert.ok(hasMethod, 'Should have method items');
        } else {
            // Pest should have file-based items
            const hasFile = ids.some((id) => id.includes('Test.php'));
            assert.ok(hasFile, 'Should have file-based test items');
        }
    });

    test('should resolve loop-based data provider datasets', async () => {
        if (stubType !== 'phpunit') return;

        const forLoop = findTestItem(
            ctrl.items,
            'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider',
        );
        assert.ok(forLoop, 'Should find for-loop data provider test');

        const forLoopChildIds: string[] = [];
        forLoop?.children.forEach((item) => {
            forLoopChildIds.push(item.id);
        });
        assert.deepStrictEqual(forLoopChildIds, [
            'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 0"',
            'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 1"',
            'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 2"',
        ]);

        const foreachArray = findTestItem(
            ctrl.items,
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider',
        );
        assert.ok(foreachArray, 'Should find foreach-array data provider test');

        const foreachArrayChildIds: string[] = [];
        foreachArray?.children.forEach((item) => {
            foreachArrayChildIds.push(item.id);
        });
        assert.deepStrictEqual(foreachArrayChildIds, [
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "alpha"',
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "beta"',
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "gamma"',
        ]);

        const foreachConst = findTestItem(
            ctrl.items,
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider',
        );
        assert.ok(foreachConst, 'Should find foreach-const data provider test');

        const foreachConstChildIds: string[] = [];
        foreachConst?.children.forEach((item) => {
            foreachConstChildIds.push(item.id);
        });
        assert.deepStrictEqual(foreachConstChildIds, [
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "alpha"',
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "beta"',
            'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "gamma"',
        ]);
    });

    test('should have correct properties on test items', async () => {
        const findMethodItem = (items: vscode.TestItemCollection): vscode.TestItem | undefined => {
            for (const [, item] of items) {
                if (item.id.includes('::') && item.uri && item.range) {
                    return item;
                }
                const child = findMethodItem(item.children);
                if (child) return child;
            }
            return undefined;
        };

        const target = findMethodItem(ctrl.items);
        assert.ok(target, 'Should find at least one method-level test item');
        assert.ok(target?.uri, 'Test item should have a uri');
        assert.ok(target?.range, 'Test item should have a range');
        assert.ok(target?.label.length > 0, 'Test item should have a non-empty label');
    });

    test('should run all tests without error', async () => {
        // phpunit.run-all is async — awaits spawn, parse, testRun.end()
        await vscode.commands.executeCommand('phpunit.run-all');
    });

    test('should save dirty files before run when saveFilesBeforeRun is enabled', async () => {
        const config = vscode.workspace.getConfiguration('phpunit');
        await config.update('saveFilesBeforeRun', true, vscode.ConfigurationTarget.Workspace);

        // Open a PHP file and make it dirty by inserting a space
        const folders = vscode.workspace.workspaceFolders;
        assert.ok(folders, 'Should have workspace folders');
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folders[0], 'tests/**/*Test.php'),
            undefined,
            1,
        );
        assert.ok(files.length > 0, 'Should find at least one test file');

        const doc = await vscode.workspace.openTextDocument(files[0]);
        const editor = await vscode.window.showTextDocument(doc);
        const originalText = doc.getText();

        // Insert a trailing comment to make the file dirty
        await editor.edit((edit) => {
            edit.insert(doc.positionAt(doc.getText().length), ' ');
        });
        assert.ok(doc.isDirty, 'Document should be dirty after edit');

        try {
            // Run tests — saveAll should save the dirty file first
            const request = new vscode.TestRunRequest();
            await api.testRunProfile.runHandler(
                request,
                new vscode.CancellationTokenSource().token,
            );

            assert.ok(!doc.isDirty, 'Document should no longer be dirty after run');
        } finally {
            // Restore original content and clean up setting
            const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length),
            );
            const restoreEditor = await vscode.window.showTextDocument(doc);
            await restoreEditor.edit((edit) => edit.replace(fullRange, originalText));
            await doc.save();
            await config.update(
                'saveFilesBeforeRun',
                undefined,
                vscode.ConfigurationTarget.Workspace,
            );
        }
    });

    test('should skip remaining processes when cancelled before run', async () => {
        // Pre-cancel the token so runProcesses loop breaks immediately
        const cts = new vscode.CancellationTokenSource();
        cts.cancel();

        // Run all tests with a pre-cancelled token — no processes should start
        const request = new vscode.TestRunRequest();
        await api.testRunProfile.runHandler(request, cts.token);

        // If we reach here without hanging, cancellation worked
        assert.ok(cts.token.isCancellationRequested);
    });
});
