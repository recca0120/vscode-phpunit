import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { activateExtension, countTestItems, findTestItem, waitForTestItems } from '../helper';

const phpunitVersion = process.env.PHPUNIT_STUB_VERSION ?? '';
const phpunitBinary = process.env.PHPUNIT_STUB_BINARY ?? '';
const phpunitArgs: string[] = process.env.PHPUNIT_STUB_ARGS ? JSON.parse(process.env.PHPUNIT_STUB_ARGS) : [];
const pestVersion = process.env.PEST_STUB_VERSION ?? '';
const pestBinary = process.env.PEST_STUB_BINARY ?? '';
const pestArgs: string[] = process.env.PEST_STUB_ARGS ? JSON.parse(process.env.PEST_STUB_ARGS) : [];

suite(`Multi-Workspace (PHPUnit ${phpunitVersion} + Pest ${pestVersion}) — E2E`, () => {
    let ctrl: vscode.TestController;

    suiteSetup(async () => {
        const api = await activateExtension();
        ctrl = api.testController;

        const folders = vscode.workspace.workspaceFolders ?? [];

        // Configure phpunit-stub folder
        const phpunitFolder = folders.find((f) => f.name === 'phpunit-stub');
        if (phpunitFolder) {
            const config = vscode.workspace.getConfiguration('phpunit', phpunitFolder.uri);
            await config.update('phpunit', phpunitBinary, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', phpunitArgs, vscode.ConfigurationTarget.WorkspaceFolder);
        }

        // Configure pest-stub folder
        const pestFolder = folders.find((f) => f.name === 'pest-stub');
        if (pestFolder) {
            const config = vscode.workspace.getConfiguration('phpunit', pestFolder.uri);
            await config.update('phpunit', pestBinary, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', pestArgs, vscode.ConfigurationTarget.WorkspaceFolder);
        }

        await vscode.commands.executeCommand('phpunit.reload');
        await waitForTestItems(ctrl, 2, 30_000);
    });

    test('should create folder root items in workspace folder order', () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        assert.ok(folders.length >= 2, `Expected at least 2 workspace folders, got ${folders.length}`);

        // Collect folder root items in order
        const folderRootItems: vscode.TestItem[] = [];
        ctrl.items.forEach((item) => {
            if (item.id.startsWith('folder:')) {
                folderRootItems.push(item);
            }
        });
        assert.ok(folderRootItems.length >= 2, `Expected at least 2 folder root items, got ${folderRootItems.length}`);

        // Verify order matches workspace folders order
        const expectedOrder = folders.map((f) => `folder:${f.uri.toString()}`);
        const actualOrder = folderRootItems.map((item) => item.id);
        assert.deepStrictEqual(
            actualOrder,
            expectedOrder,
            `Folder root items should follow workspace folder order.\nExpected: ${expectedOrder.join(', ')}\nActual: ${actualOrder.join(', ')}`,
        );
    });

    test('should have phpunit items under phpunit folder', () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const phpunitFolder = folders.find((f) => f.name === 'phpunit-stub');
        assert.ok(phpunitFolder, 'phpunit-stub folder should exist');

        const folderRoot = findTestItem(ctrl.items, `folder:${phpunitFolder!.uri.toString()}`);
        assert.ok(folderRoot, 'Should have a folder root for phpunit-stub');
        assert.ok(folderRoot!.label.includes('phpunit-stub'), `Folder root label should contain "phpunit-stub", got "${folderRoot!.label}"`);

        const childCount = countTestItems(folderRoot!.children);
        assert.ok(childCount > 0, `phpunit folder should have test items, got ${childCount}`);
    });

    test('should have pest items under pest folder', () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const pestFolder = folders.find((f) => f.name === 'pest-stub');
        assert.ok(pestFolder, 'pest-stub folder should exist');

        const folderRoot = findTestItem(ctrl.items, `folder:${pestFolder!.uri.toString()}`);
        assert.ok(folderRoot, 'Should have a folder root for pest-stub');
        assert.ok(folderRoot!.label.includes('pest-stub'), `Folder root label should contain "pest-stub", got "${folderRoot!.label}"`);

        const childCount = countTestItems(folderRoot!.children);
        assert.ok(childCount > 0, `pest folder should have test items, got ${childCount}`);
    });

    test('should run all tests across both workspaces without error', async () => {
        await vscode.commands.executeCommand('phpunit.run-all');
    });
});
