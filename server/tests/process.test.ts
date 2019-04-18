import { Process } from '../src/process';
import { projectPath } from './helpers';

describe('process test', () => {
    it('running phpunit', async () => {
        const process = new Process();
        const command = {
            title: 'phpunit',
            command: projectPath('vendor', 'bin', 'phpunit'),
            arguments: ['--configuration', projectPath('phpunit.xml')],
        };

        const response = await process.run(command);

        expect(response).toMatch('PHPUnit');
    });
});
