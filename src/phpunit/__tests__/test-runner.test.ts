import { describe, expect, it } from '@jest/globals';
import { projectPath } from './helper';
import { TestRunner, TestRunnerEvent } from '../test-runner';
import { Result } from '../problem-matcher';

describe('TestRunner Test', () => {
    it('execute phpunit', async () => {
        const onTest = jest.fn();
        const onClose = jest.fn();
        const testRunner = new TestRunner({ cwd: projectPath('') });
        testRunner.on(TestRunnerEvent.result, (test: Result) => onTest(test));
        testRunner.on(TestRunnerEvent.close, onClose);

        await testRunner.execute('php vendor/bin/phpunit -c phpunit.xml');

        expect(onTest).toHaveBeenCalledWith({
            event: 'testCount',
            count: expect.any(Number),
            flowId: expect.any(Number),
        });
        expect(onClose).toHaveBeenCalled();
    });
});
