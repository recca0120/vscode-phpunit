import { TestResults } from '../src/test-results';
import { Command } from 'vscode-languageserver/lib/main';
import { projectPath } from './helpers';
import { Argument } from '../src/argument';

describe('TestResults Test', () => {
    it('it should get tests', async () => {
        const output: string = 'output';
        const args: Argument = new Argument().set(['--log-junit', projectPath('junit.xml')]);
        const command: Command = {
            title: '',
            command: 'foo',
            arguments: await args.all(),
        };
        const testResults: TestResults = new TestResults(output, command, args);

        await testResults.getTests();
    });
});
