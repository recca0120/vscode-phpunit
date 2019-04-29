import { TextDocument, Position } from 'vscode-languageserver-types';
import _files, { Filesystem } from '../src/filesystem';
import { TestRunner } from '../src/TestRunner';
import { Process } from '../src/process';
import { projectPath } from './helpers';
import { dirname } from 'path';

describe('TestRunner', () => {
    const uri = _files.asUri(projectPath('tests/AssertionsTest.php'));

    let process: Process;
    let files: Filesystem;
    let testRunner: TestRunner;
    let textDocument: TextDocument;

    beforeEach(async () => {
        process = new Process();
        files = new Filesystem();
        testRunner = new TestRunner(process, files);

        textDocument = TextDocument.create(
            uri.path,
            'php',
            1,
            await _files.get(uri.fsPath)
        );
    });

    it('test suite', async () => {
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run('suite')).toEqual('PHPUnit');
        expect(files.findUp).toBeCalledWith(['php']);
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit'],
        });
    });

    it('test directory', async () => {
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run('directory', textDocument)).toEqual(
            'PHPUnit'
        );
        expect(files.findUp).toBeCalledWith(['php']);
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit', dirname(uri.fsPath)],
        });
    });

    it('test file', async () => {
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run('file', textDocument)).toEqual('PHPUnit');
        expect(files.findUp).toBeCalledWith(['php']);
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit', uri.fsPath],
        });
    });

    it('run test nearest method', async () => {
        const position = Position.create(20, 0);
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run('nearest', textDocument, position)).toEqual(
            'PHPUnit'
        );

        expect(files.findUp).toBeCalledWith(['php']);
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: [
                'phpunit',
                uri.fsPath,
                '--filter',
                '^.*::(test_passed|test_failed)( with data set .*)?$',
            ],
        });
    });

    it('run test nearest when not found', async () => {
        const position = Position.create(7, 0);
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.run('nearest', textDocument, position)).toEqual(
            'PHPUnit'
        );
        expect(files.findUp).toBeCalledWith(['php']);
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit', uri.fsPath],
        });
    });

    it('rerun last test', async () => {
        const position = Position.create(0, 0);
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(
            await testRunner.run('last', textDocument, Position.create(20, 0))
        ).toEqual('PHPUnit');

        expect(await testRunner.runLast(textDocument, position)).toEqual(
            'PHPUnit'
        );
        expect(files.findUp).toBeCalledWith(['php']);
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: [
                'phpunit',
                uri.fsPath,
                '--filter',
                '^.*::(test_passed|test_failed)( with data set .*)?$',
            ],
        });
    });

    it('custom php, phpunit, args', async () => {
        spyOn(files, 'findUp').and.returnValues('php', 'phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        testRunner
            .setPhpBinary('php')
            .setPhpUnitBinary('phpunit')
            .setArgs(['foo', 'bar']);
        expect(await testRunner.run('suite')).toEqual('PHPUnit');
        expect(files.findUp).not.toBeCalled();
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit', 'foo', 'bar'],
        });
    });
});
