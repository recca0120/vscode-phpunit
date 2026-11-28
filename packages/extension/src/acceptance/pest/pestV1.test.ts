import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { fixturePath } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ExtensionContext, TestItem } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { allIds } from '../../../test-support/testItems';
import { activateExtension } from '../harness';

const root = fixturePath('pest-v1-stub');
const php = process.env.PEST_V1_PHP ?? 'php';

const pestV1Runs = (() => {
    try {
        execSync(`${php} -r "exit(PHP_VERSION_ID < 80400 ? 0 : 1);"`);
        execSync(`${php} ${join('vendor', 'bin', 'pest')} --version`, {
            cwd: root,
            timeout: 10000,
        });
        return true;
    } catch {
        return false;
    }
})();

describe('Pest v1', { skip: !pestV1Runs }, () => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({
            root,
            settings: {
                php,
                phpunit: 'vendor/bin/pest',
                args: ['--test-directory=modules/billing/tests'],
            },
        });
    });
    afterEach(() => vi.clearAllMocks());

    describe('a test directory with tests/ deeper in its path', () => {
        it('passes the listed tests Pest reports with absolute paths', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            const test = 'modules/billing/tests/ExampleTest.php::it works';
            expect(allIds(items)).toContain(test);

            await extension.run();

            const passed = (extension.testRuns()[0].passed as Mock).mock.calls.map(
                ([item]) => (item as TestItem).id,
            );
            expect(passed).toContain(test);
        });
    });
});
