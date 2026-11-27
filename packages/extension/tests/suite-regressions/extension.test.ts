import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { activateExtension, recordTestRuns, waitForTestItems } from '../helper';

const binary = process.env.STUB_BINARY ?? '';
const args: string[] = JSON.parse(process.env.STUB_ARGS ?? '[]');
const expectedTestCount = Number(process.env.EXPECTED_TEST_COUNT);

const leafIds = (items: vscode.TestItemCollection): string[] => {
    const ids: string[] = [];
    items.forEach((item) => {
        ids.push(...(item.children.size > 0 ? leafIds(item.children) : [item.id]));
    });
    return ids;
};

suite(`Regression fixtures — ${process.env.STUB_TYPE} ${process.env.STUB_VERSION}`, () => {
    let ctrl: vscode.TestController;

    suiteSetup(async () => {
        ctrl = (await activateExtension()).testController;

        const folder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(folder, 'workspace folder');
        const config = vscode.workspace.getConfiguration('phpunit', folder.uri);
        await config.update('phpunit', binary, vscode.ConfigurationTarget.WorkspaceFolder);
        await config.update('args', args, vscode.ConfigurationTarget.WorkspaceFolder);

        await vscode.commands.executeCommand('phpunit.reload');
        await waitForTestItems(ctrl, 1, 30_000);
    });

    suiteTeardown(async () => {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (folder) {
            const config = vscode.workspace.getConfiguration('phpunit', folder.uri);
            await config.update('phpunit', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
            await config.update('args', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    test('every discovered test item passes when the runner runs it', async () => {
        await ctrl.resolveHandler?.(undefined);
        const discovered = leafIds(ctrl.items);

        const recorder = recordTestRuns(ctrl);
        try {
            await vscode.commands.executeCommand('phpunit.run-all');
        } finally {
            recorder.restore();
        }

        const [run] = recorder.runs;
        assert.strictEqual(discovered.length, expectedTestCount);
        assert.deepStrictEqual(
            discovered.filter((id) => !run.passedIds.includes(id)),
            [],
            'every discovered item passes',
        );
        assert.strictEqual(run.failed, 0);
    });
});
