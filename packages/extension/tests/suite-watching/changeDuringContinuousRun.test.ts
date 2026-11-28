import * as assert from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, recordTestRuns, waitUntil } from '../helper';

const aTestWithSecond = `<?php

use PHPUnit\\Framework\\TestCase;

class ATest extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }

    public function test_second(): void
    {
        $this->assertTrue(true);
    }
}
`;

suite('a method added to a test file during a continuous run of everything', () => {
    test('lists it and marks it in the rerun', async () => {
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

            await writeFile(join(root, 'tests/ATest.php'), aTestWithSecond);

            await waitUntil(
                () => recorder.runs.some((run) => run.ended && run.passedIds.includes('A::Second')),
                `a rerun marks A::Second, got ${JSON.stringify(recorder.runs)}`,
                20_000,
            ).catch(() => undefined);
            assert.deepStrictEqual(ids(), ['A', 'A::It works', 'A::Second']);
            assert.deepStrictEqual(
                recorder.runs.map((run) => run.passedIds.sort()),
                [['A::It works', 'A::Second']],
            );
        } finally {
            cancel.cancel();
            recorder.restore();
        }
    });
});
