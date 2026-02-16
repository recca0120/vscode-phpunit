import * as assert from 'node:assert';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, countTestItems, findTestItem, waitForTestItems } from '../helper';

const phpunitVersion = process.env.PHPUNIT_STUB_VERSION ?? '';
const phpunitBinary = process.env.PHPUNIT_STUB_BINARY ?? '';
const phpunitArgs: string[] = process.env.PHPUNIT_STUB_ARGS ? JSON.parse(process.env.PHPUNIT_STUB_ARGS) : [];
const pestVersion = process.env.PEST_STUB_VERSION ?? '';
const pestBinary = process.env.PEST_STUB_BINARY ?? '';
const pestArgs: string[] = process.env.PEST_STUB_ARGS ? JSON.parse(process.env.PEST_STUB_ARGS) : [];

function phpTestFile(className: string, methods: string[]): string {
    const methodBodies = methods.map((m) => [
        `    public function test_${m}()`,
        '    {',
        '        $this->assertTrue(true);',
        '    }',
    ].join('\n')).join('\n\n');

    return [
        '<?php',
        '',
        'namespace Tests;',
        '',
        'use PHPUnit\\Framework\\TestCase;',
        '',
        `class ${className}Test extends TestCase`,
        '{',
        methodBodies,
        '}',
        '',
    ].join('\n');
}

suite(`Multi-Workspace (PHPUnit ${phpunitVersion} + Pest ${pestVersion}) — E2E`, () => {
    let ctrl: vscode.TestController;
    let whenReady: () => Promise<void>;
    let workspaceFileBackup: string;
    const tempFiles: string[] = [];
    let initialPhpunitCount: number;
    let initialPestCount: number;
    let initialTotalCount: number;
    let initialGroupCount: number;

    suiteSetup(async () => {
        const workspaceFile = vscode.workspace.workspaceFile;
        if (workspaceFile) {
            workspaceFileBackup = readFileSync(workspaceFile.fsPath, 'utf-8');
        }

        const api = await activateExtension();
        ctrl = api.testController;
        whenReady = api.whenReady;

        const folders = vscode.workspace.workspaceFolders ?? [];

        const phpunitFolder = folders.find((f) => f.name === 'phpunit-stub');
        if (phpunitFolder) {
            const config = vscode.workspace.getConfiguration('phpunit', phpunitFolder.uri);
            await config.update('phpunit', phpunitBinary, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', phpunitArgs, vscode.ConfigurationTarget.WorkspaceFolder);
        }

        const pestFolder = folders.find((f) => f.name === 'pest-stub');
        if (pestFolder) {
            const config = vscode.workspace.getConfiguration('phpunit', pestFolder.uri);
            await config.update('phpunit', pestBinary, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', pestArgs, vscode.ConfigurationTarget.WorkspaceFolder);
        }

        await vscode.commands.executeCommand('phpunit.reload');
        await waitForTestItems(ctrl, 2, 30_000);

        // Capture baseline counts for later assertions
        const phpunitRoot = findTestItem(ctrl.items, `folder:${phpunitFolder!.uri.toString()}`);
        const pestRoot = findTestItem(ctrl.items, `folder:${pestFolder!.uri.toString()}`);
        initialPhpunitCount = countTestItems(phpunitRoot!.children);
        initialPestCount = countTestItems(pestRoot!.children);
        initialTotalCount = countTestItems(ctrl.items);
    });

    suiteTeardown(() => {
        for (const f of tempFiles) {
            if (existsSync(f)) unlinkSync(f);
        }
        const workspaceFile = vscode.workspace.workspaceFile;
        if (workspaceFile && workspaceFileBackup) {
            writeFileSync(workspaceFile.fsPath, workspaceFileBackup, 'utf-8');
        }
    });

    function getPhpunitTestsDir(): string {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const phpunitFolder = folders.find((f) => f.name === 'phpunit-stub');
        assert.ok(phpunitFolder, 'phpunit-stub folder should exist');
        return join(phpunitFolder!.uri.fsPath, 'tests');
    }

    function countItemsByGroupTag(items: vscode.TestItemCollection, groupTagId: string): number {
        let count = 0;
        items.forEach((item) => {
            if (item.tags.some((t) => t.id === groupTagId)) count++;
            count += countItemsByGroupTag(item.children, groupTagId);
        });
        return count;
    }

    function getFolderItemCount(folderName: string): number {
        const folder = (vscode.workspace.workspaceFolders ?? []).find((f) => f.name === folderName);
        if (!folder) return 0;
        const folderRoot = findTestItem(ctrl.items, `folder:${folder.uri.toString()}`);
        return folderRoot ? countTestItems(folderRoot.children) : 0;
    }

    async function restoreMultiWorkspace(removedFolderUri: vscode.Uri) {
        if ((vscode.workspace.workspaceFolders?.length ?? 0) < 2) {
            const folderChanged = new Promise<void>((resolve) => {
                const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
                    disposable.dispose();
                    resolve();
                });
            });
            vscode.workspace.updateWorkspaceFolders(1, 0, { uri: removedFolderUri });
            await folderChanged;
            await whenReady();
        }
    }

    // --- Basic multi-workspace assertions ---

    test('should create folder root items in workspace folder order', () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        assert.strictEqual(folders.length, 2);

        const folderRootItems: vscode.TestItem[] = [];
        ctrl.items.forEach((item) => {
            if (item.id.startsWith('folder:')) folderRootItems.push(item);
        });
        assert.strictEqual(folderRootItems.length, 2);

        const expectedOrder = folders.map((f) => `folder:${f.uri.toString()}`);
        const actualOrder = folderRootItems.map((item) => item.id);
        assert.deepStrictEqual(actualOrder, expectedOrder);
    });

    test('should have correct phpunit item count under phpunit folder', () => {
        const phpunitCount = getFolderItemCount('phpunit-stub');
        assert.strictEqual(phpunitCount, initialPhpunitCount, `phpunit-stub should have ${initialPhpunitCount} items`);
    });

    test('should have correct pest item count under pest folder', () => {
        const pestCount = getFolderItemCount('pest-stub');
        assert.strictEqual(pestCount, initialPestCount, `pest-stub should have ${initialPestCount} items`);
    });

    test('should run all tests across both workspaces without error', async () => {
        const countBefore = countTestItems(ctrl.items);
        await vscode.commands.executeCommand('phpunit.run-all');
        const countAfter = countTestItems(ctrl.items);
        assert.strictEqual(countAfter, countBefore, 'Item count should remain stable after run-all');
    });

    // --- Run commands (run-file, run-test-at-cursor, rerun) ---

    test('should run file for a specific test file', async () => {
        const testFile = join(getPhpunitTestsDir(), 'AssertionsTest.php');
        const doc = await vscode.workspace.openTextDocument(testFile);
        await vscode.window.showTextDocument(doc);

        await vscode.commands.executeCommand('phpunit.run-file');

        const countAfter = countTestItems(ctrl.items);
        assert.strictEqual(countAfter, initialTotalCount, 'Item count should remain stable after run-file');
    });

    test('should run test at cursor position', async () => {
        const testFile = join(getPhpunitTestsDir(), 'AssertionsTest.php');
        const doc = await vscode.workspace.openTextDocument(testFile);
        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor on test_passed method (line 16, 0-indexed: 15)
        const position = new vscode.Position(15, 0);
        editor.selection = new vscode.Selection(position, position);

        await vscode.commands.executeCommand('phpunit.run-test-at-cursor');

        const countAfter = countTestItems(ctrl.items);
        assert.strictEqual(countAfter, initialTotalCount, 'Item count should remain stable after run-test-at-cursor');
    });

    test('should rerun previous test', async () => {
        // rerun relies on a previous run-test-at-cursor having been executed
        await vscode.commands.executeCommand('phpunit.rerun');

        const countAfter = countTestItems(ctrl.items);
        assert.strictEqual(countAfter, initialTotalCount, 'Item count should remain stable after rerun');
    });

    // --- Group filtering ---

    test('should have group tags on test items and correct filtered count', () => {
        const groupTagId = 'group:integration';

        // Verify specific items have the tag
        const passedItem = findTestItem(ctrl.items, 'Assertions (Tests\\Assertions)::Passed');
        assert.ok(passedItem, 'Should find Assertions::Passed test item');
        assert.ok(passedItem!.tags.some((t) => t.id === groupTagId), 'test_passed should have group:integration tag');

        const attributeHiItem = findTestItem(ctrl.items, 'Attribute (Tests\\Attribute)::Hi');
        assert.ok(attributeHiItem, 'Should find Attribute::Hi test item');
        assert.ok(attributeHiItem!.tags.some((t) => t.id === groupTagId), 'Attribute::Hi should have group:integration tag');

        // Count all items with group:integration tag
        const groupItems: vscode.TestItem[] = [];
        const collectGroupItems = (items: vscode.TestItemCollection) => {
            items.forEach((item) => {
                if (item.tags.some((t) => t.id === groupTagId)) {
                    groupItems.push(item);
                }
                collectGroupItems(item.children);
            });
        };
        collectGroupItems(ctrl.items);

        assert.ok(groupItems.length > 0,
            'Should have items with group:integration tag',
        );

        // Store for later verification
        initialGroupCount = groupItems.length;
    });

    // --- Workspace change (config) ---

    test('workspace change: should reload and preserve item count after config change', async () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const config = vscode.workspace.getConfiguration('phpunit', folders[0].uri);

        await config.update('args', [...phpunitArgs, '--verbose'], vscode.ConfigurationTarget.WorkspaceFolder);
        await vscode.commands.executeCommand('phpunit.reload');
        await waitForTestItems(ctrl, 2, 30_000);

        assert.strictEqual(
            countTestItems(ctrl.items), initialTotalCount,
            'Total item count should match after config change + reload',
        );

        // Verify group count preserved after config change
        assert.strictEqual(
            countItemsByGroupTag(ctrl.items, 'group:integration'), initialGroupCount,
            'Group item count should be preserved after config change',
        );

        // Verify run-at-cursor still works after config change
        const testFile = join(getPhpunitTestsDir(), 'AssertionsTest.php');
        const doc = await vscode.workspace.openTextDocument(testFile);
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(new vscode.Position(15, 0), new vscode.Position(15, 0));
        await vscode.commands.executeCommand('phpunit.run-test-at-cursor');

        await config.update('args', phpunitArgs, vscode.ConfigurationTarget.WorkspaceFolder);
    });

    // --- File lifecycle (add, change, remove) ---
    // Uses a single test to avoid cross-test timing issues with file watchers

    test('file lifecycle: add, change, and remove a test file', async () => {
        const testFilePath = join(getPhpunitTestsDir(), 'E2eLifecycleTest.php');
        const classId = 'E2e Lifecycle (Tests\\E2eLifecycle)';
        tempFiles.push(testFilePath);

        // --- File add ---
        writeFileSync(testFilePath, phpTestFile('E2eLifecycle', ['first_method']));

        await vscode.commands.executeCommand('phpunit.reload');

        const classItem = findTestItem(ctrl.items, classId);
        assert.ok(classItem, 'file add: should discover new test class');
        assert.strictEqual(classItem!.children.size, 1, 'file add: class should have 1 method');
        assert.ok(
            findTestItem(ctrl.items, `${classId}::First method`),
            'file add: should have First method',
        );

        // Verify item count increased
        const countAfterAdd = countTestItems(ctrl.items);
        assert.ok(
            countAfterAdd > initialTotalCount,
            `file add: total count should increase (was ${initialTotalCount}, now ${countAfterAdd})`,
        );

        // Verify run-at-cursor works with new file
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const editor = await vscode.window.showTextDocument(doc);
        // Position cursor on test_first_method (line 9, 0-indexed: 8)
        editor.selection = new vscode.Selection(new vscode.Position(8, 0), new vscode.Position(8, 0));
        await vscode.commands.executeCommand('phpunit.run-test-at-cursor');

        // --- File change ---
        writeFileSync(testFilePath, phpTestFile('E2eLifecycle', ['first_method', 'second_method']));

        await vscode.commands.executeCommand('phpunit.reload');

        const updatedClassItem = findTestItem(ctrl.items, classId);
        assert.ok(updatedClassItem, 'file change: class should still exist');
        assert.strictEqual(updatedClassItem!.children.size, 2, 'file change: class should now have 2 methods');
        assert.ok(
            findTestItem(ctrl.items, `${classId}::First method`),
            'file change: should still have First method',
        );
        assert.ok(
            findTestItem(ctrl.items, `${classId}::Second method`),
            'file change: should have Second method',
        );

        const countAfterChange = countTestItems(ctrl.items);
        assert.ok(
            countAfterChange > countAfterAdd,
            `file change: total count should increase (was ${countAfterAdd}, now ${countAfterChange})`,
        );

        // Verify run-at-cursor works after file change (second method at line 14, 0-indexed: 13)
        const doc2 = await vscode.workspace.openTextDocument(testFilePath);
        const editor2 = await vscode.window.showTextDocument(doc2);
        editor2.selection = new vscode.Selection(new vscode.Position(13, 0), new vscode.Position(13, 0));
        await vscode.commands.executeCommand('phpunit.run-test-at-cursor');

        // --- File remove ---
        unlinkSync(testFilePath);

        await vscode.commands.executeCommand('phpunit.reload');
        assert.ok(
            !findTestItem(ctrl.items, classId),
            'file remove: test items should be removed after file deletion',
        );

        const countAfterRemove = countTestItems(ctrl.items);
        assert.strictEqual(
            countAfterRemove, initialTotalCount,
            'file remove: total count should return to initial',
        );

        // Verify run-all still works after file removal
        await vscode.commands.executeCommand('phpunit.run-all');
    });

    // --- Workspace remove & add (destructive — run last, in order) ---

    let removedFolderUri: vscode.Uri;

    test('workspace remove: should remove folder roots and keep remaining items', async () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        assert.strictEqual(folders.length, 2);

        removedFolderUri = folders[1].uri;

        const folderChanged = new Promise<void>(resolve => {
            const d = vscode.workspace.onDidChangeWorkspaceFolders(() => { d.dispose(); resolve(); });
        });
        vscode.workspace.updateWorkspaceFolders(1, 1);
        await folderChanged;
        await whenReady();

        // Should have phpunit items in flat structure (no folder roots)
        let hasFolderRoot = false;
        ctrl.items.forEach((item) => { if (item.id.startsWith('folder:')) hasFolderRoot = true; });
        assert.ok(!hasFolderRoot, 'Should not have folder roots in single-folder mode');

        const remainingCount = countTestItems(ctrl.items);
        assert.ok(remainingCount > 0, 'Should still have test items from remaining folder');

        // Verify reload preserves item count
        await vscode.commands.executeCommand('phpunit.reload');
        const countAfterReload = countTestItems(ctrl.items);
        assert.strictEqual(
            countAfterReload, remainingCount,
            'Reload should preserve item count in single-folder mode',
        );

        // Verify run-at-cursor works with single folder
        const testFile = join(getPhpunitTestsDir(), 'AssertionsTest.php');
        const doc = await vscode.workspace.openTextDocument(testFile);
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(new vscode.Position(15, 0), new vscode.Position(15, 0));
        await vscode.commands.executeCommand('phpunit.run-test-at-cursor');
    });

    test('workspace add: should restore folder roots with correct item counts', async () => {
        assert.ok(removedFolderUri, 'workspace remove test must run first');
        assert.strictEqual(vscode.workspace.workspaceFolders?.length, 1);

        await restoreMultiWorkspace(removedFolderUri);

        const currentFolders = vscode.workspace.workspaceFolders ?? [];
        assert.strictEqual(currentFolders.length, 2, 'Should have 2 workspace folders');

        // Verify folder roots exist
        let folderRootCount = 0;
        ctrl.items.forEach((item) => { if (item.id.startsWith('folder:')) folderRootCount++; });
        assert.strictEqual(folderRootCount, 2, 'Should have 2 folder roots');

        // Verify each folder has test items
        for (const folder of currentFolders) {
            const folderRoot = findTestItem(ctrl.items, `folder:${folder.uri.toString()}`);
            assert.ok(folderRoot, `Should have folder root for ${folder.name}`);
            assert.ok(
                countTestItems(folderRoot!.children) > 0,
                `${folder.name} should have test items`,
            );
        }

        // Verify total count matches initial
        const totalAfterRestore = countTestItems(ctrl.items);
        assert.strictEqual(
            totalAfterRestore, initialTotalCount,
            `Total item count should match initial (expected ${initialTotalCount}, got ${totalAfterRestore})`,
        );

        // Verify group count restored
        assert.strictEqual(
            countItemsByGroupTag(ctrl.items, 'group:integration'), initialGroupCount,
            'Group item count should be restored after workspace add',
        );

        // Verify reload works after workspace restore
        await vscode.commands.executeCommand('phpunit.reload');
        await waitForTestItems(ctrl, 2, 30_000);
        assert.strictEqual(
            countTestItems(ctrl.items), initialTotalCount,
            'Reload should preserve total item count after workspace restore',
        );

        // Verify run-at-cursor works after workspace restore
        const testFile = join(getPhpunitTestsDir(), 'AssertionsTest.php');
        const doc = await vscode.workspace.openTextDocument(testFile);
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(new vscode.Position(15, 0), new vscode.Position(15, 0));
        await vscode.commands.executeCommand('phpunit.run-test-at-cursor');
    });
});
