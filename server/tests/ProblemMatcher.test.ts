import { readFileSync } from 'fs';
import { PHPUnitStatus, ProblemMatcher } from '../src/ProblemMatcher';
import { fixturePath, projectPath } from './helpers';

describe('ProblemMatcher', () => {
    const file = fixturePath('test-result.txt');
    const contents: string = readFileSync(file).toString('UTF-8');
    const problemMatcher = new ProblemMatcher();

    let problems = [];

    function getProblem(name: string) {
        return problems.find(problem => problem.name.indexOf(name) !== -1);
    }

    beforeEach(async () => {
        problems = await problemMatcher.parse(contents);
    });

    it('test_isnt_same', () => {
        const problem = getProblem('AssertionsTest::test_isnt_same');

        expect(problem).toEqual({
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_isnt_same',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_isnt_same',
            status: PHPUnitStatus.FAILURE,
            uri: projectPath('tests/AssertionsTest.php'),
            range: {
                end: { character: 76, line: 26 },
                start: { character: 8, line: 26 },
            },
            message: jasmine.anything(),
            files: [
                {
                    uri: projectPath('tests/AssertionsTest.php'),
                    range: {
                        end: { character: 76, line: 26 },
                        start: { character: 8, line: 26 },
                    },
                },
            ],
        });

        expect(problem.message)
            .toContain(`Failed asserting that two arrays are identical.
--- Expected
+++ Actual
@@ @@
 Array &0 (
-    'a' => 'b'
-    'c' => 'd'
+    'e' => 'f'
+    0 => 'g'
+    1 => 'h'
 )
`);
    });

    it('addition_provider', () => {
        const problem = getProblem('AssertionsTest::addition_provider');

        expect(problem).toEqual({
            name:
                'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2 (1, 0, 2)',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'addition_provider',
            status: PHPUnitStatus.FAILURE,
            uri: projectPath('tests/AssertionsTest.php'),
            range: {
                end: { character: 48, line: 58 },
                start: { character: 8, line: 58 },
            },
            message: jasmine.anything(),
            files: [
                {
                    uri: projectPath('tests/AssertionsTest.php'),
                    range: {
                        end: { character: 48, line: 58 },
                        start: { character: 8, line: 58 },
                    },
                },
            ],
        });

        expect(problem.message).toContain(
            `Failed asserting that 1 matches expected 2.`
        );
    });

    it('test_failed', () => {
        const problem = getProblem('AssertionsTest::test_failed');

        expect(problem).toEqual({
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_failed',
            status: PHPUnitStatus.FAILURE,
            uri: projectPath('tests/AssertionsTest.php'),
            range: {
                end: { character: 33, line: 21 },
                start: { character: 8, line: 21 },
            },
            message: jasmine.anything(),
            files: [
                {
                    uri: projectPath('tests/AssertionsTest.php'),
                    range: {
                        end: { character: 33, line: 21 },
                        start: { character: 8, line: 21 },
                    },
                },
            ],
        });

        expect(problem.message).toContain(
            'Failed asserting that false is true.'
        );
    });

    it('test_risky', () => {
        const problem = getProblem('AssertionsTest::test_risky');

        expect(problem).toEqual({
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_risky',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_risky',
            status: PHPUnitStatus.RISKY,
            uri: projectPath('tests/AssertionsTest.php'),
            range: {
                end: { character: 32, line: 29 },
                start: { character: 4, line: 29 },
            },
            message: jasmine.anything(),
            files: [
                {
                    uri: projectPath('tests/AssertionsTest.php'),
                    range: {
                        end: { character: 32, line: 29 },
                        start: { character: 4, line: 29 },
                    },
                },
            ],
        });

        expect(problem.message).toContain(
            'This test did not perform any assertions'
        );
    });

    it('test_incomplete', () => {
        const problem = getProblem('AssertionsTest::test_incomplete');

        expect(problem).toEqual({
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_incomplete',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_incomplete',
            status: PHPUnitStatus.INCOMPLETE,
            uri: projectPath('tests/AssertionsTest.php'),
            range: {
                end: { character: 77, line: 49 },
                start: { character: 8, line: 49 },
            },
            message: jasmine.anything(),
            files: [
                {
                    uri: projectPath('tests/AssertionsTest.php'),
                    range: {
                        end: { character: 77, line: 49 },
                        start: { character: 8, line: 49 },
                    },
                },
            ],
        });

        expect(problem.message).toContain(
            'This test has not been implemented yet.'
        );
    });

    it('test_skipped', () => {
        const problem = getProblem('AssertionsTest::test_skipped');

        expect(problem).toEqual({
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_skipped',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_skipped',
            status: PHPUnitStatus.SKIPPED,
            uri: projectPath('tests/AssertionsTest.php'),
            range: {
                end: { character: 73, line: 44 },
                start: { character: 8, line: 44 },
            },
            message: jasmine.anything(),
            files: [
                {
                    uri: projectPath('tests/AssertionsTest.php'),
                    range: {
                        end: { character: 73, line: 44 },
                        start: { character: 8, line: 44 },
                    },
                },
            ],
        });

        expect(problem.message).toContain(
            'The MySQLi extension is not available.'
        );
    });

    it('test_sum_item_method_not_call', () => {
        const problem = getProblem(
            'CalculatorTest::test_sum_item_method_not_call'
        );

        expect(problem).toEqual({
            name:
                'Recca0120\\VSCode\\Tests\\CalculatorTest::test_sum_item_method_not_call',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'CalculatorTest',
            method: 'test_sum_item_method_not_call',
            status: PHPUnitStatus.FAILURE,
            uri: projectPath(
                'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditionsForV8.php'
            ),
            range: {
                end: { character: 35, line: 28 },
                start: { character: 8, line: 28 },
            },
            message: jasmine.anything(),
            files: jasmine.anything(),
        });

        expect(problem.message).toContain(
            `Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called
 exactly 1 times but called 0 times.`
        );
    });

    it('test_throw_exception', () => {
        const problem = getProblem('CalculatorTest::test_throw_exception');

        expect(problem).toEqual({
            name:
                'Recca0120\\VSCode\\Tests\\CalculatorTest::test_throw_exception',
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'CalculatorTest',
            method: 'test_throw_exception',
            status: PHPUnitStatus.FAILURE,
            uri: projectPath('tests/CalculatorTest.php'),
            range: {
                end: { character: 38, line: 53 },
                start: { character: 8, line: 53 },
            },
            message: jasmine.anything(),
            files: jasmine.anything(),
        });

        expect(problem.message).toContain('Exception:');
    });
});
