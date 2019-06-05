import { fixturePath, projectPath } from './helpers';
import { PHPUnitOutput, Status } from '../src/ProblemMatcher';
import { readFileSync } from 'fs';
import { TestSuiteCollection } from '../src/TestSuiteCollection';

describe('ProblemMatcher', () => {
    const file = fixturePath('test-result.txt').fsPath;
    const testFile = projectPath('tests/AssertionsTest.php').fsPath;
    const contents: string = readFileSync(file).toString('UTF-8');
    const suites = new TestSuiteCollection();
    const problemMatcher = new PHPUnitOutput(suites);

    let problems: any[] = [];

    function getProblem(id: string) {
        return problems.find(problem => problem.id === id);
    }

    beforeAll(async () => {
        await suites.load('**/*.php', { cwd: projectPath('tests').fsPath });
    });

    beforeEach(async () => {
        problems = await problemMatcher.parse(contents);
    });

    it('test_isnt_same', () => {
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_isnt_same';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_isnt_same',
            status: Status.FAILURE,
            file: testFile,
            line: 27,
            message: jasmine.anything(),
            files: [],
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
        const id =
            'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'addition_provider',
            status: Status.FAILURE,
            file: testFile,
            line: 59,
            message: jasmine.anything(),
            files: [],
        });

        expect(problem.message).toContain(
            `Failed asserting that 1 matches expected 2.`
        );
    });

    it('test_failed', () => {
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed';
        const problem = getProblem(id);
        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_failed',
            status: Status.FAILURE,
            file: testFile,
            line: 22,
            message: jasmine.anything(),
            files: [],
        });

        expect(problem.message).toContain(
            'Failed asserting that false is true.'
        );
    });

    it('test_risky', () => {
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_risky';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_risky',
            status: Status.RISKY,
            file: testFile,
            line: 30,
            message: jasmine.anything(),
            files: [],
        });

        expect(problem.message).toContain(
            'This test did not perform any assertions'
        );
    });

    it('test_incomplete', () => {
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_incomplete';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_incomplete',
            status: Status.INCOMPLETE,
            file: testFile,
            line: 50,
            message: jasmine.anything(),
            files: [],
        });

        expect(problem.message).toContain(
            'This test has not been implemented yet.'
        );
    });

    it('test_skipped', () => {
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_skipped';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'AssertionsTest',
            method: 'test_skipped',
            status: Status.SKIPPED,
            file: testFile,
            line: 45,
            message: jasmine.anything(),
            files: [],
        });

        expect(problem.message).toContain(
            'The MySQLi extension is not available.'
        );
    });

    fit('test_sum_item_method_not_call', () => {
        const id =
            'Recca0120\\VSCode\\Tests\\CalculatorTest::test_sum_item_method_not_call';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'CalculatorTest',
            method: 'test_sum_item_method_not_call',
            status: Status.FAILURE,
            file: projectPath('tests/CalculatorTest.php').toString(),
            line: 39,
            message: jasmine.anything(),
            files: jasmine.anything(),
        });

        expect(problem.message).toContain(
            `Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called
 exactly 1 times but called 0 times.`
        );
    });

    it('test_throw_exception', () => {
        const id =
            'Recca0120\\VSCode\\Tests\\CalculatorTest::test_throw_exception';
        const problem = getProblem(id);

        expect(problem).toMatchObject({
            type: 'problem',
            id,
            namespace: 'Recca0120\\VSCode\\Tests',
            class: 'CalculatorTest',
            method: 'test_throw_exception',
            status: Status.FAILURE,
            file: projectPath('tests/CalculatorTest.php').fsPath,
            line: 54,
            message: jasmine.anything(),
            files: jasmine.anything(),
        });

        expect(problem.message).toContain('Exception:');
    });
});
