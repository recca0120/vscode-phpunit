import * as assert from 'node:assert';
import { rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, recordTestRuns, waitUntil } from '../helper';

const bTest = `<?php

use PHPUnit\\Framework\\TestCase;

class BTest extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }
}
`;

suite('a test file moved in during a continuous run of everything', () => {
    test('marks its tests in the rerun', async () => {
        const { testController: ctrl, testRunProfile: profile } = await activateExtension();
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        await ctrl.resolveHandler?.(undefined);
        const ids = () => collectTestItemIds(ctrl.items).sort();
        await waitUntil(() => ids().length > 0, 'the tests are listed', 15_000);
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);

        const recorder = recordTestRuns(ctrl);
        const cancel = new vscode.CancellationTokenSource();
        try {
            void profile.runHandler(
                new vscode.TestRunRequest(undefined, undefined, profile, true),
                cancel.token,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const staged = join(tmpdir(), `BTest-${Date.now()}.php`);
            await writeFile(staged, bTest);

            await rename(staged, join(root, 'tests/BTest.php'));

            await waitUntil(
                () =>
                    recorder.runs.some((run) => run.ended && run.passedIds.includes('B::It works')),
                `a rerun marks B, got ${JSON.stringify(recorder.runs)}`,
                20_000,
            ).catch(() => undefined);
            assert.deepStrictEqual(
                recorder.runs.map((run) => run.passedIds.sort()),
                [['A::It works', 'B::It works']],
            );
        } finally {
            cancel.cancel();
            recorder.restore();
        }
    });
});
