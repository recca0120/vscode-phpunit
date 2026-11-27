import * as assert from 'node:assert';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, waitUntil } from '../helper';

suite('deleting phpunit.xml', () => {
    test('lists the tests as a start without phpunit.xml does', async () => {
        const ctrl = (await activateExtension()).testController;
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        await ctrl.resolveHandler?.(undefined);
        const ids = () => collectTestItemIds(ctrl.items).sort();
        await waitUntil(() => ids().length > 0, 'the tests are listed', 15_000);
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);

        await unlink(join(root, 'phpunit.xml'));

        await waitUntil(
            () => ids().length === 4,
            `the tests of a/ and b/ are listed, got ${JSON.stringify(ids())}`,
            15_000,
        ).catch(() => undefined);
        assert.deepStrictEqual(ids(), ['A', 'A::It works', 'B', 'B::It works']);
    });
});
