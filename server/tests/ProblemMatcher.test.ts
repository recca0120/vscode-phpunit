import { readFileSync } from 'fs';
import { PHPUnitStatus, ProblemMatcher } from '../src/ProblemMatcher';
import { fixturePath, projectPath } from './helpers';

describe('ProblemMatcher', () => {
    const file = fixturePath('test-result.txt');
    const contents: string = readFileSync(file).toString('UTF-8');
    const problemMatcher = new ProblemMatcher();

    let problems = [];

    beforeEach(async () => {
        problems = await problemMatcher.parse(contents);
    });

    it('test_isnt_same', () => {
        const problem = problems[0];

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
        const problem = problems[1];

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
        const problem = problems[2];

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
        const problem = problems[3];

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
        const problem = problems[4];

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
        const problem = problems[5];

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
});
