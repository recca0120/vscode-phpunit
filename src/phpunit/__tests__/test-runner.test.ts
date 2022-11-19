import { describe, expect, it } from '@jest/globals';
import { projectPath } from './helper';
import { TestRunner } from '../test-runner';
import { Result } from '../problem-matcher';

describe('Command Test', () => {
    it('execute phpunit', async () => {
        const onTest = jest.fn();
        const onClose = jest.fn();
        const testRunner = new TestRunner({ cwd: projectPath('') });
        testRunner.on('test', (test: Result) => onTest(test));
        testRunner.on('close', onClose);

        await testRunner.execute('php vendor/bin/phpunit -c phpunit.xml');

        expect(onTest).toHaveBeenCalledWith({
            event: 'testCount',
            count: expect.any(Number),
            flowId: expect.any(Number),
        });
        expect(onClose).toHaveBeenCalled();
    });
});
