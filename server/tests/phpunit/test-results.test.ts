import { TestResults } from '../../src/phpunit/test-results';
import { Test, Type } from '../../src/phpunit/common';
import { Range } from 'vscode-languageserver-types';

describe('TestResults Test', () => {
    it('it should get tests', async () => {
        const output: string = 'output';
        const uri: string = 'uri';

        const expected: Test[] = [
            {
                name: 'foo',
                class: 'foo',
                classname: 'foo',
                file: 'foo',
                line: 0,
                time: 0,
                type: Type.PASSED,
                range: Range.create(1, 1, 1, 1),
            },
        ];

        const testResults: TestResults = new TestResults()
            .setUri(uri)
            .setTests(expected)
            .setOutput(output);
        const tests: Test[] = testResults.getTests();

        expect(tests).toEqual(expected);
        expect(testResults.getUri()).toEqual(uri);
        expect(testResults.getOutput()).toEqual(output);
        expect(new String(testResults)).toEqual(output);
    });
});
