import { Process } from '../src/Process';
import { projectPath } from './helpers';

describe('Process', () => {
    it('running phpunit', async () => {
        const process = new Process();
        const command = {
            title: 'phpunit',
            command: projectPath('vendor', 'bin', 'phpunit').fsPath,
            arguments: ['--configuration', projectPath('phpunit.xml')],
        };

        const response = await process.run(command);

        expect(response).toMatch('PHPUnit');
    });
});
