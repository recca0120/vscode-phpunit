import { describe, expect, it } from '@jest/globals';
import { projectPath } from './helper';
import { Command, TestRunner, TestRunnerEvent } from '../test-runner';
import { Result } from '../problem-matcher';
import * as child_process from 'child_process';

jest.mock('child_process', () => {
    const requireActual = jest.requireActual('child_process');
    const spawn = jest.fn().mockImplementation((...args: any[]) => requireActual.spawn(...args));

    return { ...requireActual, spawn };
});

describe('TestRunner Test', () => {
    it('execute phpunit', async () => {
        const onTest = jest.fn();
        const onClose = jest.fn();
        const testRunner = new TestRunner({ cwd: projectPath('') });
        testRunner.on(TestRunnerEvent.result, (test: Result) => onTest(test));
        testRunner.on(TestRunnerEvent.close, onClose);

        const command = new Command();
        command.setArguments('-c phpunit.xml');

        await testRunner.execute(command);

        expect(child_process.spawn).toBeCalledWith(
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
