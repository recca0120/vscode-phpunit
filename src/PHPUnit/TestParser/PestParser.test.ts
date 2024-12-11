import { readFile } from 'fs/promises';
import { pestProject } from '../__tests__/utils';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestParser } from './TestParser';
import { TestDefinition, TestType } from './types';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    let suite: TestDefinition | undefined;
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(pestProject(''));
    const testParser = new TestParser(phpUnitXML);

    testParser.on(TestType.method, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.class, (testDefinition: TestDefinition) => suite = testDefinition);
    testParser.parse(buffer, file);

    return suite ? [{ ...suite, children: tests }] : tests;
};

describe('PestParser', () => {
    const givenTest = (method: string) => {
        return suites[0].children!.find((test) => test.method === method);
    };

    let suites: TestDefinition[];
    const file = pestProject('tests/Unit/ExampleTest.php');

    beforeAll(async () => {
        const buffer = await readFile(file);
        suites = parse(buffer, file);
    });

    it('not test or test', async () => {
        expect(givenTest('hello')).toBeUndefined();
    });

    it('parse class', async () => {
        expect(suites[0]).toEqual(expect.objectContaining({
            type: TestType.class,
            id: 'P\\Tests\\Unit\\ExampleTest',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            class: 'ExampleTest',
            file,
            start: { line: 1, character: 0 },
            end: { line: expect.any(Number), character: 0 },
        }));
    });

    it('parse test', async () => {
        expect(givenTest('example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::example',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            class: 'ExampleTest',
            method: 'example',
            label: 'example',
            file,
            start: { line: 3, character: 0 },
            end: { line: 5, character: 3 },
        });
    });

    it('parse it', async () => {
        expect(givenTest('it test example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::it test example',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            class: 'ExampleTest',
            method: 'it test example',
            label: 'it test example',
            file,
            start: { line: 7, character: 0 },
            end: { line: 9, character: 3 },
        });
    });

    it('parse describe', async () => {
        expect(givenTest('`something` → example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::`something` → example',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            class: 'ExampleTest',
            method: '`something` → example',
            label: 'something → example',
            file,
            start: { line: 18, character: 4 },
            end: { line: 20, character: 7 },
        });
    });

    it('parse nested describe', async () => {
        expect(givenTest('`something` → `something else` → it test example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::`something` → `something else` → it test example',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            class: 'ExampleTest',
            method: '`something` → `something else` → it test example',
            label: 'something → something else → it test example',
            file,
            start: { line: 23, character: 8 },
            end: { line: 25, character: 11 },
        });
    });
});