import { projectPath } from './helper';
import { Command } from '../command';
import { problemMatcher, Result } from '../problem-matcher';

describe('Command Test', () => {
    it('execute phpunit', async () => {
        const onTest = jest.fn();
        const onClose = jest.fn();
        const command = new Command();
        command.on('test', (test: Result) => onTest(test));
        command.on('close', onClose);
        await command.execute('php vendor/bin/phpunit -c phpunit.xml', { cwd: projectPath('') });

        expect(onTest).toHaveBeenCalledWith({
            event: 'testCount',
            count: 19,
            flowId: expect.anything(),
        });
        expect(onClose).toHaveBeenCalled();
    });
});
