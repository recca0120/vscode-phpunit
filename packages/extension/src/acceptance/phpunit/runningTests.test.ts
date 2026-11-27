import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ExtensionContext } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { phpUnitFixture } from '../../../test-support/fixtures';
import { expectSpawned } from '../../../test-support/process';
import {
    activateAndRun,
    byVersion,
    expectTestResultCalled,
    phpUnitSettings,
    stubs,
} from '../support';

describe.each(stubs.phpUnit)(
    'PHPUnit $name ($phpUnitVersion)',
    ({ root, phpUnitVersion, binary, args }) => {
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
                    phpUnitVersion,
                    [
                        ['12.0.0', { enqueued: 82, started: 67, passed: 50, failed: 15, end: 1 }],
                        ['10.0.0', { enqueued: 82, started: 81, passed: 67, failed: 12, end: 1 }],
                    ],
                    { enqueued: 82, started: 59, passed: 38, failed: 19, end: 1 },
                );

                expectTestResultCalled(extension, expected);
            });

            it('runs the tests of a namespace', async () => {
                const extension = await activateAndRun(context, {
                    include: phpUnitFixture.items.testsNamespace,
                });

                const expected = byVersion(
                    phpUnitVersion,
                    [
                        ['12.0.0', { enqueued: 81, started: 66, passed: 50, failed: 14, end: 1 }],
                        ['10.0.0', { enqueued: 81, started: 80, passed: 67, failed: 11, end: 1 }],
                    ],
                    { enqueued: 81, started: 58, passed: 38, failed: 18, end: 1 },
                );

                expectTestResultCalled(extension, expected);
            });

            it('runs the tests of a class', async () => {
                const extension = await activateAndRun(context, {
                    include: phpUnitFixture.items.assertions,
                });

                const expected = byVersion(
                    phpUnitVersion,
                    [
                        ['12.0.0', { enqueued: 12, started: 6, passed: 1, failed: 3, end: 1 }],
                        ['10.0.0', { enqueued: 12, started: 11, passed: 6, failed: 3, end: 1 }],
                    ],
                    { enqueued: 12, started: 12, passed: 7, failed: 3, end: 1 },
                );

                expectTestResultCalled(extension, expected);
            });

            it('runs a single test method and points its failure at the failing line', async () => {
                const id = `Calculator (Tests\\Calculator)::Throw exception`;
                const extension = await activateAndRun(context, { include: id });

                expectTestResultCalled(extension, {
                    enqueued: 1,
                    started: 1,
                    passed: 0,
                    failed: 1,
                    end: 1,
                });

                const { failed } = extension.testRuns()[0];
                const call = (failed as Mock).mock.calls.find(
                    ([test]: { id: string }[]) => test.id === id,
                );
                expect(call).toBeDefined();
                const [, message] = call ?? [];

                expect(message.location).toEqual(
                    expect.objectContaining({
                        range: {
                            start: expect.objectContaining({ line: 53, character: 0 }),
                            end: expect.objectContaining({ line: 53, character: 0 }),
                        },
                    }),
                );
            });

            it('runs a single data set of a data provider', async () => {
                const id = `Data Provider Attribute (Tests\\DataProviderAttribute)::Attribute provider with data set "two plus three"`;
                await activateAndRun(context, { include: id });

                expectSpawned({
                    cwd: root,
                    args: [
                        binary,
                        /--filter=.*testAttributeProvider with data set "two plus three"/,
                        '--colors=always',
                        '--teamcity',
                        /DataProviderAttributeTest\.php/,
                    ],
                });
            });
        });
    },
);
