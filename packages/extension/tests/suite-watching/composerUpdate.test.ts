import * as assert from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, waitUntil } from '../helper';

suite('composer update rewriting composer.json and composer.lock', () => {
    test('reloads the tests once', async () => {
        const ctrl = (await activateExtension()).testController;
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        await ctrl.resolveHandler?.(undefined);
        const ids = () => collectTestItemIds(ctrl.items).sort();
        await waitUntil(() => ids().length > 0, 'the tests are listed', 15_000);
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        let reloads = 0;
        let listed = true;
        const timer = setInterval(() => {
            const empty = ctrl.items.size === 0;
            if (empty && listed) {
                reloads++;
            }
            listed = !empty;
        }, 5);
        await writeFile(join(root, 'composer.json'), '{"name":"vendor/updated"}');
        await new Promise((resolve) => setTimeout(resolve, 100));
        await writeFile(join(root, 'composer.lock'), '{"packages":[]}');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        clearInterval(timer);

        assert.strictEqual(reloads, 1);
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);
    });
});
