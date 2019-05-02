import { Process } from '../src/Process';
import { projectPath } from './helpers';
import files from '../src/Filesystem';
import { join } from 'path';

describe('Process', () => {
    fit('running phpunit', async () => {
        const phpUnitBinary = await files.findup(
            ['vendor/bin/phpunit', 'phpunit'],
            projectPath('tests').fsPath
        );
        const process = new Process();
        const command = {
            title: 'phpunit',
            command: phpUnitBinary,
            arguments: ['--configuration', projectPath('phpunit.xml').fsPath],
        };

        const response = await process.run(command);

        expect(response).toMatch('PHPUnit');
    });
});
