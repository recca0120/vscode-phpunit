import { readFile } from 'fs/promises';
import { pestProject } from '../__tests__/utils';
import { PestParser } from './PestParser';
import { TestDefinition, TestType } from './TestParser';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    let suite: TestDefinition | undefined;
    const testParser = new PestParser();
    testParser.setRoot(pestProject(''));

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
            start: { line: 0, character: 0 },
            end: { line: 15, character: 0 },
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
            start: { line: 2, character: 0 },
            end: { line: 4, character: 3 },
        });
    });

    it('parse it', async () => {
        expect(givenTest('it_test_example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::it_test_example',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            class: 'ExampleTest',
            method: 'it_test_example',
            label: 'it_test_example',
            file,
            start: { line: 6, character: 0 },
            end: { line: 8, character: 3 },
        });
    });
});