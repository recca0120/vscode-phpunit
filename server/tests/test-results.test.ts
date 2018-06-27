import { TestResults } from '../src/test-results';
import { projectPath } from './helpers';
import { Argument } from '../src/argument';
import { Test } from '../src/common';

describe('TestResults Test', () => {
    it('it should get tests', async () => {
        const output: string = 'output';
        const args: Argument = new Argument().set(['--log-junit', projectPath('junit.xml')]);
        const testResults: TestResults = new TestResults(output, args);

        const tests: Test[] = await testResults.getTests();
        tests.forEach((test: Test) => expect(test).toBeInstanceOf(Object));
    });
});
