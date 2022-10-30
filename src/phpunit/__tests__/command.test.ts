import { describe, it, expect } from '@jest/globals';
import { projectPath } from './helper';
import { Command } from '../command';
import { Result } from '../problem-matcher';

describe('Command Test', () => {
    it('execute phpunit', async () => {
        const onTest = jest.fn();
        const onClose = jest.fn();
        const command = new Command({ cwd: projectPath('') });
        command.on('test', (test: Result) => onTest(test));
        command.on('close', onClose);
        await command.execute('php vendor/bin/phpunit -c phpunit.xml');

        expect(onTest).toHaveBeenCalledWith({
            event: 'testCount',
            count: expect.any(Number),
            flowId: expect.any(Number),
        });
        expect(onClose).toHaveBeenCalled();
    });
});
