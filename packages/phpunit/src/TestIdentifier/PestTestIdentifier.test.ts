import { describe, expect, it } from 'vitest';
import { TestType } from '../types';
import './PestFixer';
import { PestTestIdentifier } from './PestTestIdentifier';

describe('PestTestIdentifier', () => {
    const transformer = new PestTestIdentifier();

    describe('generateUniqueId', () => {
        it('test /** with comment */ should do', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'test /** with comment */ should do';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::test /** with comment */ should do';
            expect(transformer.uniqueId({ type, classFQN, methodName })).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName =
                'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const classFQN = className;

            const expected =
                'tests/Unit/ExampleTest.php::ensures the given closures reports the correct class name and suggests the [pest()] function';
            expect(transformer.uniqueId({ type, classFQN, methodName })).toEqual(expected);
        });
    });

    describe('generateSearchText', () => {
        it('test /** with comment */ should do', () => {
            const input = 'test /** with comment */ should do';
            const expected = 'test /\\*\\* with comment \\*/ should do';
            expect(input.replace(/([[\]()*])/g, '\\$1')).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const input =
                'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const expected =
                'ensures the given closures reports the correct class name and suggests the \\[pest\\(\\)\\] function';
            expect(input.replace(/([[\]()*])/g, '\\$1')).toEqual(expected);
        });
    });

    describe('fromLocationHint with namespaced describe block (::class)', () => {
        it.each([
            [
                // describe(PlaylistService::class, ...) where PlaylistService is in Foo\\Services namespace
                'pest_qn://tests/Unit/PlaylistServiceTests.php::`Foo\\Services\\PlaylistService` → it does something',
                'it does something',
                'tests/Unit/PlaylistServiceTests.php::`Foo\\Services\\PlaylistService` → it does something',
            ],
        ])('fromLocationHint(%j, %j) → id: %s', (locationHint, name, expectedId) => {
            const result = transformer.fromLocationHint(locationHint, name);
            expect(result.id).toBe(expectedId);
        });
    });

    // Pest v4: php_qn:// format with __pest_evaluable__ method names
    // locationHint points to TestCaseFactory.php (not the test file),
    // so we must derive the file path from the classFQN in the locationHint.
    describe('fromLocationHint v4 php_qn:// evaluable format', () => {
        const phpQnBase =
            "php_qn:///path/to/vendor/pestphp/pest/src/Factories/TestCaseFactory.php(169) : eval()'d code::";

        it.each([
            // string describe: describe('something', fn() => it('test example'))
            [
                `${phpQnBase}\\P\\Tests\\Unit\\DescribeTest::__pest_evaluable__something__→_it_test_example`,
                '__pest_evaluable__something__→_it_test_example',
                'tests/Unit/DescribeTest.php::`something` → it test example',
            ],
            // nested string describe
            [
                `${phpQnBase}\\P\\Tests\\Unit\\DescribeTest::__pest_evaluable__something__→__something_else__→_it_test_example`,
                '__pest_evaluable__something__→__something_else__→_it_test_example',
                'tests/Unit/DescribeTest.php::`something` → `something else` → it test example',
            ],
            // FQN describe: describe(PeName::class, fn() => it('should reject...'))
            [
                `${phpQnBase}\\P\\Tests\\Unit\\ClassConstantDatasetTest::__pest_evaluable__App_Domain_PeName__→_it_should_reject_not_of_type_Standard_and_Dynamic`,
                '__pest_evaluable__App_Domain_PeName__→_it_should_reject_not_of_type_Standard_and_Dynamic',
                'tests/Unit/ClassConstantDatasetTest.php::`App\\Domain\\PeName` → it should reject not of type Standard and Dynamic',
            ],
            // FQN describe with dataset child (with data set suffix is NOT encoded)
            [
                `${phpQnBase}\\P\\Tests\\Unit\\ClassConstantDatasetTest::__pest_evaluable__App_Domain_PeName__→_it_should_reject_not_of_type_Standard_and_Dynamic with data set "(App\\Domain\\PeName Enum (Standard, 'Standard'))"`,
                `__pest_evaluable__App_Domain_PeName__→_it_should_reject_not_of_type_Standard_and_Dynamic with data set "(App\\Domain\\PeName Enum (Standard, 'Standard'))"`,
                `tests/Unit/ClassConstantDatasetTest.php::\`App\\Domain\\PeName\` → it should reject not of type Standard and Dynamic with data set "(App\\Domain\\PeName Enum (Standard, 'Standard'))"`,
            ],
        ])('fromLocationHint(%j, %j) → id: %s', (locationHint, name, expectedId) => {
            const result = transformer.fromLocationHint(locationHint, name);
            expect(result.id).toBe(expectedId);
        });
    });

    describe('fromLocationHint v2 evaluable testSuiteStarted', () => {
        it.each([
            [
                'file:///path/to/tests/Unit/DatasetTest.php',
                'Users\\path\\to\\tests\\Unit\\DatasetTest::__pest_evaluable_it_adds_numbers',
                'tests/Unit/DatasetTest.php::it adds numbers',
            ],
            [
                'file:///path/to/tests/Unit/DatasetTest.php',
                'Users\\path\\to\\tests\\Unit\\DatasetTest::__pest_evaluable_it_validates_emails',
                'tests/Unit/DatasetTest.php::it validates emails',
            ],
            [
                'file:///path/to/tests/Unit/DatasetTest.php',
                'Users\\path\\to\\tests\\Unit\\DatasetTest::__pest_evaluable_it_business_closed',
                'tests/Unit/DatasetTest.php::it business closed',
            ],
        ])('fromLocationHint(%j, %j) → id: %s', (locationHint, name, expectedId) => {
            const result = transformer.fromLocationHint(locationHint, name);
            expect(result.id).toBe(expectedId);
        });
    });
});
