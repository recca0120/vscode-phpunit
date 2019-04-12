import { join } from 'path';
import { Process } from '../src/Process';

describe('process test', () => {
    it('running phpunit', async () => {
        const process = new Process();
        const command = {
            title: 'phpunit',
            command: join(__dirname, 'fixtures/project-sub/vendor/bin/phpunit'),
            arguments: [
                '--configuration',
                join(__dirname, 'fixtures/project-sub/phpunit.xml')
            ]
        };

        const response = await process.run(command);

        expect(response).toContain('PHPUnit');
    });
});
