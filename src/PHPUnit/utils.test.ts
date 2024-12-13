import { titleCase } from './utils';

describe('utils', () => {
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

        it('snake_case Aaa -> Snake Case Aaa', () => {
            expect(titleCase('snake_case Aaa')).toEqual('Snake Case Aaa');
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