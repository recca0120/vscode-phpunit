import { converter, titleCase } from './Converter';
import { TestType } from './types';

describe('Converter', () => {
    describe('generateUniqueId', () => {
        it('test /** with comment */ should do', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'test /** with comment */ should do';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::test /** with comment {@*} should do';
            expect(converter.generateUniqueId({ type, classFQN, methodName })).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::ensures the given closures reports the correct class name and suggests the [pest()] function';
            expect(converter.generateUniqueId({ type, classFQN, methodName })).toEqual(expected);
        });
    });

    describe('generateSearchText', () => {
        it('test /** with comment */ should do', () => {
            const input = 'test /** with comment */ should do';
            const expected = 'test /\\*\\* with comment \\*/ should do';
            expect(converter.generateSearchText(input)).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const input = 'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const expected = 'ensures the given closures reports the correct class name and suggests the \\[pest\\(\\)\\] function';
            expect(converter.generateSearchText(input)).toEqual(expected);
        });
    });


    describe('title case', () => {
        it('NoNamespace -> No Namespace', () => {
            expect(titleCase('NoNamespace')).toEqual('No Namespace');
        });

        it('noNamespace -> No Namespace', () => {
            expect(titleCase('NoNamespace')).toEqual('No Namespace');
        });

        it('VSCode -> VSCode', () => {
            expect(titleCase('VSCode')).toEqual('VSCode');
        });

        it('Recca0120 -> Recca0120', () => {
            expect(titleCase('Recca0120')).toEqual('Recca0120');
        });

        it('Assertions2 -> Assertions2', () => {
            expect(titleCase('Assertions2')).toEqual('Assertions2');
        });

        it('snake_case -> Snake Case', () => {
            expect(titleCase('snake_case')).toEqual('Snake Case');
        });

        it('snake_case_AAA -> Snake Case AAA', () => {
            expect(titleCase('snake_case_AAA')).toEqual('Snake Case AAA');
        });

        it('snake_case AAA -> Snake Case AAA', () => {
            expect(titleCase('snake_case AAA')).toEqual('Snake Case AAA');
        });

        it('camelCase -> Camel Case', () => {
            expect(titleCase('camelCase')).toEqual('Camel Case');
        });

        it('PascalCase -> Pascal Case', () => {
            expect(titleCase('PascalCase')).toEqual('Pascal Case');
        });

        it('kebab-case -> Kebab-Case', () => {
            expect(titleCase('kebab-case')).toEqual('Kebab Case');
        });

        it('This is an HTML element -> This Is An HTML Element', () => {
            expect(titleCase('This is an HTML element')).toEqual('This Is An HTML Element');
        });
    });
});