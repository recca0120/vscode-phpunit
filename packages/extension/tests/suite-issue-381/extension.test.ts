import * as assert from 'node:assert';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, countTestItems, findTestItem, waitForTestItems } from '../helper';

const phpunitBinary = process.env.ISSUE381_PHPUNIT_BINARY ?? '';

suite('Issue #381 — duplicate tests in multi-root workspace with shared config', () => {
    let ctrl: vscode.TestController;

    suiteSetup(async () => {
        const api = await activateExtension();
        ctrl = api.testController;

        const folders = vscode.workspace.workspaceFolders ?? [];
        assert.strictEqual(folders.length, 2, 'Should have 2 workspace folders');

        const phpFolder = folders.find((f) => f.name === 'php-project');
        assert.ok(phpFolder, 'php-project folder should exist');

        // Configure phpunit binary for php-project
        const phpConfig = vscode.workspace.getConfiguration('phpunit', phpFolder.uri);
        await phpConfig.update(
            'phpunit',
            phpunitBinary,
            vscode.ConfigurationTarget.WorkspaceFolder,
        );

        // Simulate the bug: set --configuration with absolute path at WORKSPACE level
        // This causes BOTH folders to load the same phpunit.xml
        const phpunitXmlPath = join(phpFolder.uri.fsPath, 'phpunit.xml');
        const wsConfig = vscode.workspace.getConfiguration('phpunit');
        await wsConfig.update(
            'args',
            [`--configuration=${phpunitXmlPath}`],
            vscode.ConfigurationTarget.Workspace,
        );

        await vscode.commands.executeCommand('phpunit.reload');
        await waitForTestItems(ctrl, 2, 30_000);
    });

    suiteTeardown(async () => {
        const wsConfig = vscode.workspace.getConfiguration('phpunit');
        await wsConfig.update('args', undefined, vscode.ConfigurationTarget.Workspace);

        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const folder of folders) {
            const config = vscode.workspace.getConfiguration('phpunit', folder.uri);
            await config.update('phpunit', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    test('should only discover tests under php-project, not ts-project', () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const phpFolder = folders.find((f) => f.name === 'php-project');
        const tsFolder = folders.find((f) => f.name === 'ts-project');
        assert.ok(phpFolder && tsFolder);

        const phpRoot = findTestItem(ctrl.items, `folder:${phpFolder.uri.toString()}`);
        const tsRoot = findTestItem(ctrl.items, `folder:${tsFolder.uri.toString()}`);

        // php-project should have tests
        assert.ok(phpRoot, 'php-project folder root should exist');
        const phpCount = countTestItems(phpRoot.children);
        assert.ok(phpCount > 0, `php-project should have test items (got ${phpCount})`);

        // ts-project should NOT have tests — this is the bug
        // Currently ts-project discovers the same tests because --configuration points to
        // php-project's phpunit.xml with an absolute path
        if (tsRoot) {
            const tsCount = countTestItems(tsRoot.children);
            assert.strictEqual(
                tsCount,
                0,
                `ts-project should have 0 test items but got ${tsCount} (duplicate tests from php-project)`,
            );
        }
    });

    test('total test count should equal php-project test count only', () => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const phpFolder = folders.find((f) => f.name === 'php-project');
        assert.ok(phpFolder);

        const phpRoot = findTestItem(ctrl.items, `folder:${phpFolder.uri.toString()}`);
        assert.ok(phpRoot);

        const phpCount = countTestItems(phpRoot.children);
        const totalCount = countTestItems(ctrl.items);

        // Total should be: 2 folder roots + php-project's test items
        // If there are duplicate tests, totalCount will be much higher
        const expectedTotal = 2 + phpCount; // 2 folder root items + php tests
        assert.strictEqual(
            totalCount,
            expectedTotal,
            `Total items (${totalCount}) should be 2 folder roots + ${phpCount} php tests = ${expectedTotal}. ` +
                'Extra items indicate duplicate test discovery in ts-project.',
        );
    });
});
