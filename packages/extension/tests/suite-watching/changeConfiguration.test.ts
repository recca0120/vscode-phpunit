import * as assert from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { activateExtension, collectTestItemIds, waitUntil } from '../helper';

const scenario = process.env.CONFIGURATION_SCENARIO ?? '';
const configurationFile = process.env.CONFIGURATION_FILE ?? '';
const directory = process.env.CONFIGURATION_NEW_DIRECTORY ?? '';

suite(`changing the configuration file given with -c (${scenario})`, () => {
    test('reloads the tests', async () => {
        const ctrl = (await activateExtension()).testController;
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        await ctrl.resolveHandler?.(undefined);
        const ids = () => collectTestItemIds(ctrl.items).sort();
        await waitUntil(() => ids().length > 0, 'the tests are listed', 15_000);
        assert.deepStrictEqual(ids(), ['A', 'A::It works']);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await writeFile(
            join(root, configurationFile),
            `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="default">
            <directory>${directory}</directory>
        </testsuite>
    </testsuites>
</phpunit>
`,
        );

        await waitUntil(() => ids().includes('B'), 'the tests are reloaded', 15_000).catch(
            () => undefined,
        );
        assert.deepStrictEqual(ids(), ['B', 'B::It works']);
    });
});
