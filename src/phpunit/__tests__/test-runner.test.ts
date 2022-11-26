import { describe, expect, it, beforeEach } from '@jest/globals';
import { projectPath } from './helper';
import { Command, TestRunner, TestRunnerEvent } from '../test-runner';
import { Result } from '../problem-matcher';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('TestRunner Test', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('execute phpunit', async () => {
        const onTest = jest.fn();
        const onClose = jest.fn();
        const testRunner = new TestRunner({ cwd: projectPath('') });
        testRunner.on(TestRunnerEvent.result, (test: Result) => onTest(test));
        testRunner.on(TestRunnerEvent.close, onClose);

        const command = new Command();
        command.setArguments('-c phpunit.xml');

        await testRunner.run(command);

        expect(spawn).toBeCalledWith(
            'php',
            ['vendor/bin/phpunit', '--configuration=phpunit.xml', '--teamcity', '--colors=never'],
            { cwd: projectPath('') }
        );

        expect(onTest).toHaveBeenCalledWith({
            event: 'testCount',
            count: expect.any(Number),
            flowId: expect.any(Number),
        });
        expect(onClose).toHaveBeenCalled();
    });
});
