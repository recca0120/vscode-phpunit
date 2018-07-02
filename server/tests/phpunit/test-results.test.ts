import { TestResults } from '../../src/phpunit/test-results';
import { projectPath } from '../helpers';
import { Test, Type } from '../../src/phpunit/common';
import { JUnitParser } from '../../src/phpunit/junit-parser';

describe('TestResults Test', () => {
    it('it should get tests', async () => {
        const output: string = 'output';

        const expected: Test[] = [
            {
                name: 'foo',
                class: 'foo',
                classname: 'foo',
                file: 'foo',
                line: 0,
                time: 0,
                type: Type.PASSED,
            },
        ];

        const testResults: TestResults = new TestResults().setTests(expected).setOutput(output);
        const tests: Test[] = testResults.getTests();

        expect(tests).toEqual(expected);
    });
});
