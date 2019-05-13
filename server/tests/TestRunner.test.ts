import _files, { Filesystem } from '../src/filesystem';
import { Process } from '../src/process';
import { TestRunner } from '../src/TestRunner';

describe('TestRunner', () => {
    let process: Process;
    let files: Filesystem;
    let testRunner: TestRunner;

    beforeEach(async () => {
        process = new Process();
        files = new Filesystem();
        testRunner = new TestRunner(process, files);
    });

    it('run all', async () => {
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run()).toEqual('PHPUnit');
        expect(files.findup).toHaveBeenCalledWith([
            'vendor/bin/phpunit',
            'phpunit',
        ]);
        expect(process.run).toHaveBeenCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [],
        });
    });

    it('run file', async () => {
        const file = 'foo.php';
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run({ file })).toEqual('PHPUnit');
        expect(files.findup).toHaveBeenCalledWith([
            'vendor/bin/phpunit',
            'phpunit',
        ]);
        expect(process.run).toHaveBeenCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [file],
        });
    });

    it('rerun', async () => {
        const file = 'foo.php';
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run({ file })).toEqual('PHPUnit');
        expect(await testRunner.rerun({})).toEqual('PHPUnit');
        expect(files.findup).toHaveBeenCalledWith([
            'vendor/bin/phpunit',
            'phpunit',
        ]);
        expect(process.run).toHaveBeenCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [file],
        });
        expect(process.run).toHaveBeenCalledTimes(2);
    });

    it('run test ', async () => {
        const file = 'foo.php';
        const method = 'test_passed';
        const depends = ['test_failed'];

        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run({ file, method, depends })).toEqual(
            'PHPUnit'
        );

        expect(files.findup).toHaveBeenCalledWith([
            'vendor/bin/phpunit',
            'phpunit',
        ]);
        expect(process.run).toHaveBeenCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [
                file,
                '--filter',
                '^.*::(test_passed|test_failed)( with data set .*)?$',
            ],
        });
    });

    it('custom php, phpunit, args', async () => {
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        testRunner
            .setPhpBinary('php')
            .setPhpUnitBinary('phpunit')
            .setArgs(['foo', 'bar']);

        expect(new String(await testRunner.run())).toEqual('PHPUnit');
        expect(files.findup).not.toHaveBeenCalled();
        expect(process.run).toHaveBeenCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit', 'foo', 'bar'],
        });
    });

    it('cancel', async () => {
        spyOn(process, 'kill');
        await testRunner.cancel();
        expect(process.kill).toBeCalled();
    });
});
