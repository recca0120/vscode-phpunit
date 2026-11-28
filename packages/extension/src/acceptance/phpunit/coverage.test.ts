import { join } from 'node:path';
import { CloverParser, type FileCoverageData, initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
    CancellationTokenSource,
    DeclarationCoverage,
    type ExtensionContext,
    Position,
    StatementCoverage,
    TestCoverageCount,
    type TestItem,
    TestRunProfileKind,
} from 'vscode';
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
            const parseFileSpy = vi
                .spyOn(CloverParser.prototype, 'parseFile')
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

            expect(parseFileSpy).toHaveBeenCalledTimes(2);
            expect(parseFileSpy.mock.calls[0][0]).toMatch(
                /\.phpunit\.cache[/\\]coverage-.+-0\.xml$/,
            );
            expect(parseFileSpy.mock.calls[1][0]).toMatch(
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

        it('reports the method coverage next to the statement coverage', async () => {
            const file = join(root, 'src/Calc.php');
            vi.spyOn(CloverParser.prototype, 'parseFile').mockResolvedValue(
                new CloverParser().parseXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1795856450">
  <project timestamp="1795856450" name="Clover Coverage">
    <file name="${file}">
      <class name="Calc" namespace="global">
        <metrics complexity="2" methods="2" coveredmethods="1" conditionals="0" coveredconditionals="0" statements="2" coveredstatements="1" elements="4" coveredelements="2"/>
      </class>
      <line num="5" type="method" name="add" visibility="public" complexity="1" crap="1" count="1"/>
      <line num="7" type="stmt" count="1"/>
      <line num="10" type="method" name="sub" visibility="public" complexity="1" crap="2" count="0"/>
      <line num="12" type="stmt" count="0"/>
      <line num="18" type="stmt" count="0"/>
      <metrics loc="20" ncloc="20" classes="1" methods="2" coveredmethods="1" conditionals="0" coveredconditionals="0" statements="3" coveredstatements="1" elements="5" coveredelements="2"/>
    </file>
    <metrics files="1" loc="20" ncloc="20" classes="1" methods="2" coveredmethods="1" conditionals="0" coveredconditionals="0" statements="3" coveredstatements="1" elements="5" coveredelements="2"/>
  </project>
</coverage>`),
            );
            const extension = await activateExtension(context);
            const testItem = findItem(extension.controller.items, 'Calculator (Tests\\Calculator)');
            await extension.run([testItem], { kind: TestRunProfileKind.Coverage });
            const testRun = extension.testRuns()[0];
            const [[fileCoverage]] = (testRun.addCoverage as Mock).mock.calls;

            const details = await extension
                .profile(TestRunProfileKind.Coverage)
                .loadDetailedCoverage?.(testRun, fileCoverage, new CancellationTokenSource().token);

            expect(fileCoverage.statementCoverage).toEqual(new TestCoverageCount(1, 3));
            expect(fileCoverage.declarationCoverage).toEqual(new TestCoverageCount(1, 2));
            expect(details).toEqual([
                new StatementCoverage(1, new Position(6, 0)),
                new StatementCoverage(0, new Position(11, 0)),
                new StatementCoverage(0, new Position(17, 0)),
                new DeclarationCoverage('add', 1, new Position(4, 0)),
                new DeclarationCoverage('sub', 0, new Position(9, 0)),
            ]);
        });
    });
});
