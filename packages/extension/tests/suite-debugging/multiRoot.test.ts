import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, waitUntil } from '../helper';

suite('debugging every folder of a multi-root workspace at once', () => {
    test('stops the debug session of each folder', async () => {
        const ctrl = (await activateExtension()).testController;
        await ctrl.resolveHandler?.(undefined);
        const ids = () => collectTestItemIds(ctrl.items).filter((id) => id.includes('::'));
        await waitUntil(() => ids().length === 2, 'the tests of both folders are listed', 15_000);
        const started: string[] = [];
        const terminated: string[] = [];
        vscode.debug.onDidStartDebugSession((session) => {
            started.push(session.workspaceFolder?.name ?? '');
        });
        vscode.debug.onDidTerminateDebugSession((session) => {
            terminated.push(session.workspaceFolder?.name ?? '');
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));

        for (let attempt = 0; attempt < 3 && started.length === 0; attempt++) {
            await vscode.commands.executeCommand('testing.debugAll');
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        await waitUntil(() => terminated.length === 2, 'both debug sessions end', 15_000).catch(
            () => undefined,
        );

        assert.deepStrictEqual([...started].sort(), ['a', 'b']);
        assert.deepStrictEqual([...terminated].sort(), ['a', 'b']);
        assert.strictEqual(vscode.debug.activeDebugSession, undefined);
    });
});
