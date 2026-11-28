import * as assert from 'node:assert';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, waitUntil } from '../helper';

suite('editing a test file without saving', () => {
    test('lists the typed test method and drops it when the edit is reverted', async () => {
        const ctrl = (await activateExtension()).testController;
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        await ctrl.resolveHandler?.(undefined);
        const ids = () => collectTestItemIds(ctrl.items).sort();
        await waitUntil(() => ids().length > 0, 'the tests are listed', 15_000);
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);

        const document = await vscode.workspace.openTextDocument(join(root, 'tests/ATest.php'));
        const editor = await vscode.window.showTextDocument(document);
        await editor.edit((builder) =>
            builder.insert(
                document.lineAt(document.lineCount - 2).range.start,
                '\n    public function test_typed(): void\n    {\n        $this->assertTrue(true);\n    }\n',
            ),
        );

        await waitUntil(() => ids().length === 3, 'the typed test is listed', 5_000).catch(
            () => undefined,
        );
        assert.deepStrictEqual(ids(), ['A', 'A::It works', 'A::Typed']);

        await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');

        await waitUntil(() => ids().length === 2, 'the typed test is dropped', 5_000).catch(
            () => undefined,
        );
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);
    });
});
