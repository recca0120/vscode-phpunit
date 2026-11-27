import { spawnSync } from 'node:child_process';
import { TestOutputParser } from '../src/TestOutput/TestOutputParser';
import { TeamcityEvent } from '../src/TestOutput/types';

export const runnerStartedTestIds = (args: string[], cwd: string): string[] => {
    const { stdout } = spawnSync('php', args, { cwd, encoding: 'utf8' });
    const parser = new TestOutputParser();

    return stdout
        .split(/\r?\n/)
        .map((line) => parser.parse(line))
        .filter((result) => result?.event === TeamcityEvent.testStarted)
        .map((result) => (result as { id: string }).id);
};
