import { TestRunner } from '../../src/phpunit/test-runner';
import { TestResult } from '../../src/phpunit/test-result';
import { Filesystem, Factory as FilesystemFactory } from '../../src/filesystem';
import { projectPath } from '../helpers';
import { isWindows } from '../../src/support/helpers';
import { Process } from '../../src/support/process';
import { Argument } from '../../src/phpunit/argument';
import { Type } from '../../src/phpunit/common';
import { JUnitParser } from '../../src/phpunit/junit-parser';

describe('TestRunner Test', () => {
    it('it should execute phpunit', async () => {
        const process: Process = new Process();
        spyOn(process, 'spawn').and.returnValue('output');

        const args: Argument = new Argument();
        spyOn(args, 'all').and.returnValue(['--foo']);
        spyOn(args, 'get').and.returnValue('junit.xml');

        const files: Filesystem = new FilesystemFactory().create();
        spyOn(files, 'get').and.returnValue('junit content');
        spyOn(files, 'unlink').and.returnValue(true);

        const parser: JUnitParser = new JUnitParser();
        spyOn(parser, 'parse').and.returnValue([
            {
                name: 'foo',
                class: 'foo',
                classname: 'foo',
                file: 'foo',
                line: 0,
                time: 0,
                type: Type.PASSED,
            },
        ]);

        const testRunner: TestRunner = new TestRunner(process, args, files, parser);
        const testResult: TestResult = await testRunner.handle(projectPath('tests'), [], projectPath('src'));

        expect(new String(testResult)).toEqual('output');

        expect(process.spawn).toBeCalledWith({
            title: '',
            command: `${projectPath('vendor/bin/phpunit')}${isWindows() ? '.bat' : ''}`,
            arguments: ['--foo'],
        });

        expect(files.get).toBeCalledWith('junit.xml');
        expect(parser.parse).toBeCalledWith('junit content');
        expect(files.unlink).toBeCalledWith('junit.xml');
    });

    it('it should execute with custom phpunit and default arguments', async () => {
        const process: Process = new Process();
        spyOn(process, 'spawn').and.returnValue('output');

        const args: Argument = new Argument();
        spyOn(args, 'all').and.returnValue(['--foo']);
        spyOn(args, 'get').and.returnValue('junit.xml');

        const files: Filesystem = new FilesystemFactory().create();
        spyOn(files, 'get').and.returnValue('junit content');
        spyOn(files, 'unlink').and.returnValue(true);

        const parser: JUnitParser = new JUnitParser();
        spyOn(parser, 'parse').and.returnValue([
            {
                name: 'foo',
                class: 'foo',
                classname: 'foo',
                file: 'foo',
                line: 0,
                time: 0,
                type: Type.PASSED,
            },
        ]);

        const testRunner: TestRunner = new TestRunner(process, args, files, parser);

        testRunner.setBinary('foo');
        testRunner.setDefaults(['--bar']);

        const testResult: TestResult = await testRunner.handle('', [], projectPath('src'));

        expect(new String(testResult)).toEqual('output');

        expect(process.spawn).toBeCalledWith({
            title: '',
            command: 'foo',
            arguments: ['--foo'],
        });

        expect(files.get).toBeCalledWith('junit.xml');
        expect(parser.parse).toBeCalledWith('junit content');
        expect(files.unlink).toBeCalledWith('junit.xml');
    });
});
