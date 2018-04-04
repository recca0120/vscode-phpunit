import { resolve } from 'path';
import { Filesystem, FilesystemContract } from '../../server/src/filesystem';
import { Process } from '../src/process';
import { os, OS } from '../src/helpers';
import { PhpUnitArguments, PhpUnit } from './../src/phpunit';

describe('PhpUnit Test', () => {
    it('it should execute phpunit', async () => {
        const path = resolve(__dirname, 'fixtures/project/tests/PHPUnitTest.php');
        const command = resolve(__dirname, `fixtures/project/vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`);
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const phpUnitArguments: PhpUnitArguments = new PhpUnitArguments(files);
        const phpUnit = new PhpUnit(files, process, phpUnitArguments);

        spyOn(phpUnitArguments, 'getArguments').and.returnValue([path]);
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

    it('it should execute phpunit with customize binary and arguments', async () => {
        const path = resolve(__dirname, 'fixtures/project/tests/PHPUnitTest.php');
        const command = resolve(__dirname, 'fixtures/project/vendor/bin/unittest');
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const phpUnitArguments: PhpUnitArguments = new PhpUnitArguments(files);
        const phpUnit = new PhpUnit(files, process, phpUnitArguments);

        spyOn(phpUnitArguments, 'setArguments').and.callThrough();
        spyOn(phpUnitArguments, 'getArguments').and.returnValue([path]);
        spyOn(process, 'spawn').and.returnValue('output');

        const output: string = await phpUnit
            .setBinary(command)
            .setArguments(['foo', 'bar'])
            .run({
                command: '',
                arguments: [path],
            });

        expect((phpUnitArguments.setArguments as jasmine.Spy).calls.argsFor(0)).toEqual([['foo', 'bar', path]]);

        expect((process.spawn as jasmine.Spy).calls.argsFor(0)).toEqual([
            {
                arguments: [path],
                command: command,
                title: '',
            },
        ]);

        expect(output).toEqual('output');
    });
});
