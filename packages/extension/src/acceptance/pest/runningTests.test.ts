import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';
import type { ExtensionContext } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { expectSpawned } from '../../../test-support/process';
import {
    activateAndRun,
    byVersion,
    expectTestResultCalled,
    methodFilter,
    phpUnitSettings,
    stubs,
} from '../support';

describe.each(stubs.pest)('Pest $name ($pestVersion)', ({ root, pestVersion, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
    });
    afterEach(() => vi.clearAllMocks());

    describe('running tests', () => {
        it('runs all tests', async () => {
            const extension = await activateAndRun(context);

            const expected = byVersion(
                pestVersion,
                [['3.0.0', { enqueued: 93, started: 93, passed: 86, failed: 4, end: 1 }]],
                { enqueued: 93, started: 86, passed: 82, failed: 0, end: 1 },
            );

            expectTestResultCalled(extension, expected);
        });

        it('runs a single test', async () => {
            const id = `tests/Unit/ExampleTest.php::test_description`;
            const extension = await activateAndRun(context, { include: id });

            expectTestResultCalled(extension, {
                enqueued: 1,
                started: 1,
                passed: 1,
                failed: 0,
                end: 1,
            });
        });

        it('runs every data set of a test with a dataset', async () => {
            const id = `tests/Unit/ExampleTest.php::it has user's email`;
            const extension = await activateAndRun(context, { include: id });

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    methodFilter(`it has user\\'s email`),
                    '--colors=always',
                    '--teamcity',
                ],
            });

            const expected = byVersion(
                pestVersion,
                [['3.0.0', { enqueued: 3, started: 3, passed: 3, failed: 0, end: 1 }]],
                { enqueued: 3, started: 2, passed: 2, failed: 0, end: 1 },
            );

            expectTestResultCalled(extension, expected);
        });

        it('runs a single data set by its exact description', async () => {
            const id = `tests/Unit/ExampleTest.php::it has user's email with data set "('enunomaduro@gmail.com')"`;
            await activateAndRun(context, { include: id });

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    `--filter=/^.*::(it has user\\'s email with data set "\\(\\'enunomaduro@gmail\\.com\\'\\)")$/`,
                    '--colors=always',
                    '--teamcity',
                    /ExampleTest\.php/,
                ],
            });
        });
    });
});
