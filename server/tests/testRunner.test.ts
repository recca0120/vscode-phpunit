import { TextDocument, Position } from 'vscode-languageserver-types';
import _files, { Filesystem } from '../src/filesystem';
import { TestRunner } from '../src/TestRunner';
import { Process } from '../src/process';
import { projectPath } from './helpers';

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

    it('run test nearest method', async () => {
        const position = Position.create(20, 0);
        spyOn(files, 'findUp').and.returnValue('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.runTestNearest(textDocument, position)).toEqual(
            'PHPUnit'
        );
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
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

    it('run test nearest when not found', async () => {
        const position = Position.create(5000, 0);
        spyOn(files, 'findUp').and.returnValue('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(await testRunner.runTestNearest(textDocument, position)).toEqual(
            'PHPUnit'
        );
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
        expect(process.run).toBeCalledWith({
            title: 'PHPUnit LSP',
            command: 'phpunit',
            arguments: [uri.fsPath],
        });
    });

    it('rerun last test', async () => {
        const position = Position.create(0, 0);
        spyOn(files, 'findUp').and.returnValue('phpunit');
        spyOn(process, 'run').and.returnValue('PHPUnit');

        expect(
            await testRunner.rerunLastTest(textDocument, Position.create(20, 0))
        ).toEqual('PHPUnit');

        expect(await testRunner.rerunLastTest(textDocument, position)).toEqual(
            'PHPUnit'
        );
        expect(files.findUp).toBeCalledWith(['vendor/bin/phpunit', 'phpunit']);
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
});
