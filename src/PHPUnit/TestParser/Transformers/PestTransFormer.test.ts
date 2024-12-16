import { TestType } from '../types';
import { PestTransformer } from './PestTransformer';

describe('PestTransformer', () => {
    const transformer = new PestTransformer();

    describe('generateUniqueId', () => {
        it('test /** with comment */ should do', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'test /** with comment */ should do';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::test /** with comment {@*} should do';
            expect(transformer.uniqueId({ type, classFQN, methodName })).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::ensures the given closures reports the correct class name and suggests the [pest()] function';
            expect(transformer.uniqueId({ type, classFQN, methodName })).toEqual(expected);
        });
    });

    describe('generateSearchText', () => {
        it('test /** with comment */ should do', () => {
            const input = 'test /** with comment */ should do';
            const expected = 'test /\\*\\* with comment \\*/ should do';
            expect(input.replace(/([\[\]()*])/g, '\\$1')).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const input = 'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const expected = 'ensures the given closures reports the correct class name and suggests the \\[pest\\(\\)\\] function';
            expect(input.replace(/([\[\]()*])/g, '\\$1')).toEqual(expected);
        });
    });
});