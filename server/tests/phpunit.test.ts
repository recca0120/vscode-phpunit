import { PhpUnit } from './../src/phpunit';
import { resolve } from 'path';
import { Filesystem, FilesystemContract } from '../../server/src/filesystem';
import { Process } from '../src/process';
import { os, OS } from '../src/helpers';

describe('PhpUnit Test', () => {
    it('it should execute phpunit', async () => {
        const path = resolve(__dirname, 'fixtures/project/tests/PHPUnitTest.php');
        const command = resolve(__dirname, `fixtures/project/vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`);
        const phpUnitDotXml = resolve(__dirname, 'fixtures/project/phpunit.xml.dist');
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const phpUnit = new PhpUnit(files, process);

        spyOn(process, 'spawn').and.returnValue('output');

        const output: string = await phpUnit.run({
            command: '',
            arguments: [path],
        });

        expect((process.spawn as jasmine.Spy).calls.argsFor(0)).toEqual([
            {
                arguments: [path, '-c', phpUnitDotXml],
                command: command,
                title: '',
            },
        ]);

        expect(output).toEqual('output');
    });

    it('it should execute phpunit when phpunit.xml found', async () => {
        const path = resolve(__dirname, 'fixtures/project/tests/PHPUnitTest.php');
        const command = resolve(__dirname, `fixtures/project/vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`);
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const phpUnit = new PhpUnit(files, process);

        spyOn(files, 'findUp').and.callFake((...args: any[]) => {
            expect(args[1]).toEqual(resolve(__dirname, 'fixtures/project/tests'));

            let found: string;
            switch (args[0]) {
                case 'composer.json':
                    found = resolve(__dirname, 'fixtures/project/composer.json');
                    break;
                case 'vendor/bin/phpunit.bat':
                    found = resolve(__dirname, 'fixtures/project/vendor/bin/phpunit.bat');
                    expect(args[2]).toEqual(resolve(__dirname, 'fixtures/project'));
                    break;
                case 'vendor/bin/phpunit':
                    found = resolve(__dirname, 'fixtures/project/vendor/bin/phpunit');
                    expect(args[2]).toEqual(resolve(__dirname, 'fixtures/project'));
                    break;
                case 'phpunit.xml':
                    found = '';
                    expect(args[2]).toEqual(resolve(__dirname, 'fixtures/project'));
                    break;
                case 'phpunit.xml.dist':
                    found = '';
                    expect(args[2]).toEqual(resolve(__dirname, 'fixtures/project'));
                    break;
            }

            return found;
        });

        spyOn(process, 'spawn').and.returnValue('output');

        const output: string = await phpUnit.run({
            command: '',
            arguments: [path],
        });

        expect((process.spawn as jasmine.Spy).calls.argsFor(0)).toEqual([
            {
                arguments: [path],
                command: command,
                title: '',
            },
        ]);

        expect(output).toEqual('output');
    });

    it('it should execute phpunit use customize phpunit binary path and arguments', async () => {
        const path = resolve(__dirname, 'fixtures/project/tests/PHPUnitTest.php');
        const command = resolve(__dirname, 'bin/php');
        const args = [
            resolve(__dirname, 'fixtures/bin/phpunit'),
            '--configuration',
            resolve(__dirname, 'fixtures/project/phpunit.xml'),
        ];
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const phpUnit = new PhpUnit(files, process);

        spyOn(process, 'spawn').and.returnValue('output');

        phpUnit.setBinary(command).setArgs(args);

        const output: string = await phpUnit.run({
            command: '',
            arguments: [path],
        });

        expect((process.spawn as jasmine.Spy).calls.argsFor(0)[0].command).toEqual(command);
        expect((process.spawn as jasmine.Spy).calls.argsFor(0)[0].arguments).toEqual(args.concat([path]));

        expect(output).toEqual('output');
    });
});
