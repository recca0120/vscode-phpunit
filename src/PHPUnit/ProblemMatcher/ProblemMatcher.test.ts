import { ProblemMatcher } from './ProblemMatcher';
import { TestResultParser } from './TestResultParser';
import { TestResultEvent, TestStarted, TestResult, TestSuiteStarted } from '.';

/**
 * Test suite for ProblemMatcher
 *
 * This test suite addresses an issue with Pest executing PHPUnit format tests:
 * - PHP 8.2.27
 * - Pest 1.23.1
 * - PHPUnit 9.6.21
 *
 * The issue: When Pest runs PHPUnit format tests, the teamcity testStarted event
 * has a locationHint starting with `php_qn://` but lacks a flowId. This caused
 * the system to fail in finding the corresponding testSuiteStarted flowId,
 * preventing the triggering of completion or failure events.
 */
describe('ProblemMatcher', () => {
    let problemMatcher: ProblemMatcher;
    let mockTestResultParser: jest.Mocked<TestResultParser>;

    beforeEach(() => {
        mockTestResultParser = {
            parse: jest.fn(),
        } as any;
        problemMatcher = new ProblemMatcher(mockTestResultParser);
    });

    test('should handle testStarted event with php_qn:// locationHint and missing flowId', () => {
        const testSuiteStartedEvent: TestSuiteStarted = {
            event: TestResultEvent.testSuiteStarted,
            name: "Tests\\Feature\\ExampleTest",
            locationHint: "pest_qn://Tests\\Feature\\ExampleTest",
            flowId: 123,
        } as TestSuiteStarted;
        // Simulate a previous testSuiteStarted event with a flowId
        mockTestResultParser.parse.mockReturnValueOnce(testSuiteStartedEvent);
        problemMatcher.parse('testSuiteStarted input');

        const testStartedEvent: TestStarted = {
            event: TestResultEvent.testStarted,
            name: '測試首頁',
            locationHint: "php_qn:///path/to/tests/Feature/ExampleTest.php::\\Tests\\Feature\\ExampleTest::測試首頁",
        } as TestStarted;
        mockTestResultParser.parse.mockReturnValue(testStartedEvent);

        const result = problemMatcher.parse('testStarted input') as TestStarted;

        expect(result).toBeDefined();
        expect(result.flowId).toBe(123);
        expect(result.event).toBe(TestResultEvent.testStarted);
        expect(result.name).toBe('測試首頁');
    });

    test('should return 0 when no matching flowId is found', () => {
        const testStartedEvent: TestStarted = {
            event: TestResultEvent.testStarted,
            name: '測試首頁',
            locationHint: "php_qn:///path/to/tests/Feature/ExampleTest.php::\\Tests\\Feature\\ExampleTest::測試首頁",
        } as TestStarted;
        mockTestResultParser.parse.mockReturnValue(testStartedEvent);

        const result = problemMatcher.parse('testStarted input') as TestStarted;

        expect(result).toBeDefined();
        expect(result.flowId).toBe(0);
        expect(result.event).toBe(TestResultEvent.testStarted);
        expect(result.name).toBe('測試首頁');
    });
});
