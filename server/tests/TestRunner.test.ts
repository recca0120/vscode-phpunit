import _files, { Filesystem } from '../src/filesystem';
import { dirname } from 'path';
import { Position, TextDocument } from 'vscode-languageserver-protocol';
import { Process } from '../src/process';
import { projectPath } from './helpers';
import { TestRunner } from '../src/TestRunner';
import { TestSuiteCollection } from '../src/TestSuiteCollection';

describe('TestRunner', () => {
    const uri = _files.asUri(projectPath('tests/AssertionsTest.php'));

    let process: Process;
    let files: Filesystem;
    let testRunner: TestRunner;
    let textDocument: TextDocument;
    let suites: TestSuiteCollection;

    beforeEach(async () => {
        suites = await new TestSuiteCollection().load(projectPath(''));
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

    it('run all', async () => {
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(new String(await testRunner.runAll())).toEqual('PHPUnit');
        // expect(files.findup).not.toBeCalledWith(['php']);
        expect(files.findup).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [],
        });
    });

    it('rerun', async () => {
        const position = Position.create(0, 0);
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(
            new String(
                await testRunner.rerun({
                    textDocument,
                    position: Position.create(20, 0),
                    suites: suites,
                })
            )
        ).toEqual('PHPUnit');

        expect(
            new String(
                await testRunner.rerun({
                    textDocument,
                    position,
                    suites: suites,
                })
            )
        ).toEqual('PHPUnit');

        expect(files.findup).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [
                uri.fsPath,
                '--filter',
                '^.*::(test_passed|test_failed)( with data set .*)?$',
            ],
        });
    });

    it('run file', async () => {
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(new String(await testRunner.runFile({ textDocument }))).toEqual(
            'PHPUnit'
        );
        expect(files.findup).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [uri.fsPath],
        });
    });

    it('run test at cursor', async () => {
        const position = Position.create(20, 0);
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(
            new String(
                await testRunner.runTestAtCursor({
                    textDocument,
                    position,
                    suites: suites,
                })
            )
        ).toEqual('PHPUnit');

        expect(files.findup).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [
                uri.fsPath,
                '--filter',
                '^.*::(test_passed|test_failed)( with data set .*)?$',
            ],
        });
    });

    it('run test-at-cursor when not found', async () => {
        const position = Position.create(7, 0);
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(
            new String(
                await testRunner.runTestAtCursor({
                    textDocument,
                    position,
                    suites: suites,
                })
            )
        ).toEqual('PHPUnit');

        expect(files.findup).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [uri.fsPath],
        });
    });

    it('custom php, phpunit, args', async () => {
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        testRunner
            .setPhpBinary('php')
            .setPhpUnitBinary('phpunit')
            .setArgs(['foo', 'bar']);

        expect(new String(await testRunner.runAll())).toEqual('PHPUnit');
        expect(files.findup).not.toBeCalled();
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'php',
            arguments: ['phpunit', 'foo', 'bar'],
        });
    });

    it('run directory', async () => {
        spyOn(files, 'findup').and.returnValues('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(
            new String(await testRunner.runDirectory({ textDocument }))
        ).toEqual('PHPUnit');
        expect(files.findup).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [dirname(uri.fsPath)],
        });
    });

    it('cancel', async () => {
        spyOn(process, 'kill');
        await testRunner.cancel();
        expect(process.kill).toBeCalled();
    });
});
