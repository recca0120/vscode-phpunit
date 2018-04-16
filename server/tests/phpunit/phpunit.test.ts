import { Filesystem, FilesystemContract } from '../../../server/src/filesystem';
import { os, OS } from '../../src/helpers';
import { Parameters, PhpUnit } from '../../src/phpunit';
import { Process } from '../../src/process';
import { projectPath } from '../helpers';
import { resolve } from 'path';

describe('PhpUnit Test', () => {
    it('it should execute phpunit', async () => {
        const path = projectPath('tests/PHPUnitTest.php');
        const command = projectPath(`vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`);
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const parameters: Parameters = new Parameters(files);
        const phpUnit = new PhpUnit(files, process, parameters);

        spyOn(parameters, 'all').and.returnValue([path]);
        spyOn(process, 'spawn').and.returnValue('output');

        expect(await phpUnit.run(path)).toEqual(0);

        expect(phpUnit.getOutput()).toEqual('output');
        expect(phpUnit.getTests()).toEqual([]);

        expect((process.spawn as jasmine.Spy).calls.argsFor(0)).toEqual([
            {
                arguments: [path],
                command: command,
                title: '',
            },
        ]);
    });

    it('it should execute phpunit with customize binary and arguments', async () => {
        const path = projectPath('tests/PHPUnitTest.php');
        const command = projectPath('vendor/bin/unittest');
        const files: FilesystemContract = new Filesystem();
        const process: Process = new Process();
        const parameters: Parameters = new Parameters(files);
        const phpUnit = new PhpUnit(files, process, parameters);

        spyOn(parameters, 'set').and.callThrough();
        spyOn(parameters, 'all').and.returnValue([path]);
        spyOn(process, 'spawn').and.returnValue('output');

        expect(
            await phpUnit
                .setBinary(command)
                .setDefault(['foo', 'bar'])
                .run(path, ['-c', 'bootstrap.php'])
        ).toEqual(0);

        expect(phpUnit.getOutput()).toEqual('output');
        expect(phpUnit.getTests()).toEqual([]);

        expect((parameters.set as jasmine.Spy).calls.argsFor(0)).toEqual([['foo', 'bar', '-c', 'bootstrap.php', path]]);

        expect((process.spawn as jasmine.Spy).calls.argsFor(0)).toEqual([
            {
                arguments: [path],
                command: command,
                title: '',
            },
        ]);
    });
});
