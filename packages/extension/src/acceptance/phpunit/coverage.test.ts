import { join } from 'node:path';
import { CloverParser, type FileCoverageData, initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type ExtensionContext, type TestItem, TestRunProfileKind } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { expectSpawned } from '../../../test-support/process';
import { findItem } from '../../../test-support/testItems';
import { activateExtension } from '../harness';
import { stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    describe('coverage', () => {
        it('collects the coverage of each process into the test run', async () => {
            const fakeData: FileCoverageData[] = [
                { filePath: join(root, 'src/Foo.php'), covered: 1, total: 2, lines: [] },
            ];
            const parseCloverSpy = vi
                .spyOn(CloverParser.prototype, 'parseClover')
                .mockResolvedValue(fakeData);

            const extension = await activateExtension(context);
            const { controller } = extension;
            const include = ['Assertions (Tests\\Assertions)', 'Calculator (Tests\\Calculator)']
                .map((id) => findItem(controller.items, id))
                .filter((item): item is TestItem => item !== undefined);
            const request = await extension.run(include, {
                kind: TestRunProfileKind.Coverage,
            });

            ['AssertionsTest.php', 'CalculatorTest.php'].forEach((file, i) => {
                expectSpawned({
                    cwd: root,
                    args: [
                        '-dxdebug.mode=coverage',
                        binary,
                        new RegExp(file),
                        '--colors=always',
                        '--teamcity',
                        '--coverage-clover',
                        new RegExp(`\\.phpunit\\.cache[/\\\\]coverage-.+-${i}\\.xml`),
                    ],
                    env: { XDEBUG_MODE: 'coverage' },
                });
            });

            expect(parseCloverSpy).toHaveBeenCalledTimes(2);
            expect(parseCloverSpy.mock.calls[0][0]).toMatch(
                /\.phpunit\.cache[/\\]coverage-.+-0\.xml$/,
            );
            expect(parseCloverSpy.mock.calls[1][0]).toMatch(
                /\.phpunit\.cache[/\\]coverage-.+-1\.xml$/,
            );

            const testRun = extension.testRuns()[0];
            expect(testRun.addCoverage).toHaveBeenCalledTimes(2);

            const createTestRunCalls = (controller.createTestRun as Mock).mock.calls;
            expect(createTestRunCalls.length).toBeGreaterThan(0);
            for (const [calledRequest] of createTestRunCalls) {
                expect(calledRequest).toBe(request);
            }
        });
    });
});
