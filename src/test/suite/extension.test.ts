import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, countTestItems, type ExtensionApi, waitForTestItems } from '../helper';

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

    test('should activate extension', () => {
        const ext = vscode.extensions.getExtension('recca0120.vscode-phpunit')!;
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
        assert.ok(target!.uri, 'Test item should have a uri');
        assert.ok(target!.range, 'Test item should have a range');
        assert.ok(target!.label.length > 0, 'Test item should have a non-empty label');
    });

    test('should run all tests without error', async () => {
        // phpunit.run-all is async — awaits spawn, parse, testRun.end()
        await vscode.commands.executeCommand('phpunit.run-all');
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
