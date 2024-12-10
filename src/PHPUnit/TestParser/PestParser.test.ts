import { pestProject } from '../__tests__/utils';
import { PestParser } from './PestParser';
import { TestDefinition, TestType } from './TestParser';

describe('PestParser', () => {
    const parser = new PestParser();
    parser.setRoot(pestProject(''));
    const file = pestProject('tests/Unit/ExampleTest.php');
    let tests: TestDefinition[];

    beforeEach(async () => tests = (await parser.parseFile(file))!);

    const findTestByMethod = (method: string) => {
        return tests.find((test) => test.method === method);
    };

    it('function name must be it or test', async () => {
        expect(findTestByMethod('hello')).toBeUndefined();
    });

    it('parse function test', async () => {
        expect(findTestByMethod('example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::example',
            namespace: 'P\\Tests\\Unit',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            class: 'ExampleTest',
            method: 'example',
            label: 'example',
            file,
            start: { line: 2, character: 0 },
            end: { line: 4, character: 3 },
        });
    });

    fit('parse function it', async () => {
        expect(findTestByMethod('it_test_example')).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::it_test_example',
            namespace: 'P\\Tests\\Unit',
            qualifiedClass: 'P\\Tests\\Unit\\ExampleTest',
            class: 'ExampleTest',
            method: 'it_test_example',
            label: 'it_test_example',
            file,
            start: { line: 6, character: 0 },
            end: { line: 8, character: 3 },
        });
    });
});