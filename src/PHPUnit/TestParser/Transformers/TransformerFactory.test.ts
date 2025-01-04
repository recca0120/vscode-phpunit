import { TransformerFactory } from './TransformerFactory';
import { AppState } from '../../../AppState';

/**
 * Test suite for TransformerFactory
 *
 * This test suite addresses an issue where locationHint starting with 'file://'
 * was incorrectly identified as non-Pest test files. This was observed with:
 * - PHP 8.1.31
 * - Pest 2.36.0
 * - PHPUnit 10.5.36
 *
 * ##teamcity[testSuiteStarted name='Tests\Feature\ExampleTest' locationHint='file://tests/Feature/ExampleTest.php' flowId='OOOO']
 */
describe('TransformerFactory', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        AppState.getInstance().parserTestTypeMap.clear();
    });

    const testCases = [
        { input: 'pest', expected: true },
        { input: 'P\\', expected: true },
        { input: 'pest_qn://', expected: true },
        { input: 'php_qn://', expected: false },
        { input: 'file://test.php', expected: false },
        { input: 'other', expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
        test(`isPest with input "${input}" should return ${expected}`, () => {
            expect(TransformerFactory.isPest(input)).toBe(expected);
        });
    });

    test('isPest with TransformerInput object (locationHint)', () => {
        AppState.setParserTestType('Tests\\Feature\\ExampleTest', true);
        expect(TransformerFactory.isPest({ locationHint: 'file://tests/Feature/FooTest.php', testResultName: 'Test Suite' })).toBe(false);
        expect(TransformerFactory.isPest({ locationHint: 'file://tests/Feature/FooTest.php', testResultName: 'path/to/phpunit.xml' })).toBe(false);
        expect(TransformerFactory.isPest({ locationHint: 'file://tests/Feature/ExampleTest.php', testResultName: 'Test Suite' })).toBe(true);
        expect(TransformerFactory.isPest({ locationHint: 'file://tests/Feature/ExampleTest.php', testResultName: 'path/to/phpunit.xml' })).toBe(true);
    });

    test('isPest with TransformerInput object (classFQN)', () => {
        expect(TransformerFactory.isPest({ classFQN: 'pest' })).toBe(true);
        expect(TransformerFactory.isPest({ classFQN: 'other' })).toBe(false);
    });

    test('factory method returns correct transformer', () => {
        const pestTransformer = TransformerFactory.factory('pest');
        const phpunitTransformer = TransformerFactory.factory('php_qn://');

        expect(pestTransformer.constructor.name).toBe('PestTransformer');
        expect(phpunitTransformer.constructor.name).toBe('PHPUnitTransformer');
    });

    test('factory method with TransformerInput object', () => {
        const pestTransformer = TransformerFactory.factory({ locationHint: 'pest_qn://', testResultName: 'TestName' });
        const phpunitTransformer = TransformerFactory.factory({ locationHint: 'php_qn://' });

        expect(pestTransformer.constructor.name).toBe('PestTransformer');
        expect(phpunitTransformer.constructor.name).toBe('PHPUnitTransformer');
    });
});