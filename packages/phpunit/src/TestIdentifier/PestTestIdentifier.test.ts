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
