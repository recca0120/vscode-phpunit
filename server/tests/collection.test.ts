import { Collection } from './../src/collection';
import { Test, Type } from '../src/phpunit';
import { TextDocument, DiagnosticSeverity } from 'vscode-languageserver';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Collection Test', () => {
    it('it should set tests and remove same tests', () => {
        const collect: Collection = new Collection();

        const oldTests: Test[] = [
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 10,
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_2',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 20,
                time: 1,
                type: Type.PASSED,
            },
        ];

        collect.set(oldTests);

        expect(collect.get('foo')).toEqual([
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 10,
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_2',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 20,
                time: 1,
                type: Type.PASSED,
            },
        ]);

        const newTests: Test[] = [
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 10,
                time: 2,
                type: Type.PASSED,
            },
            {
                name: 'method_3',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 30,
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                file: 'bar',
                line: 10,
                time: 2,
                type: Type.PASSED,
            },
        ];

        collect.set(newTests);

        expect(collect.get('foo')).toEqual([
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 10,
                time: 2,
                type: Type.PASSED,
            },
            {
                name: 'method_2',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 20,
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_3',
                class: 'foo',
                classname: 'string',
                file: 'foo',
                line: 30,
                time: 1,
                type: Type.PASSED,
            },
        ]);

        expect(collect.get('bar')).toEqual([
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                file: 'bar',
                line: 10,
                time: 2,
                type: Type.PASSED,
            },
        ]);
    });
});
