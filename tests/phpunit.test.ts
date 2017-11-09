import { Command, PHPUnit, Process, Validator } from '../src/phpunit';

import { Filesystem } from './../src/filesystem';
import { Parser } from '../src/parser';
import { join } from 'path';

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const parser = new Parser();
        const process = new Process();
        const phpunit = new PHPUnit(parser, process);
        const tests = await parser.parseXML(join(__dirname, 'fixtures/junit.xml'));
        spyOn(parser, 'parseXML').and.returnValue(Promise.resolve(tests));
        spyOn(process, 'spawn').and.callFake(() => {
            process.emit('exit');
        });

        const command = new Command('foo.php', []);
        const result = await phpunit.handle(command);

        expect(parser.parseXML).toHaveBeenCalled();
        expect(process.spawn).toHaveBeenCalled();
        expect(result).toBe(tests);
    });
});

describe('Process Tests', () => {
    it('it should exec echo 123', done => {
        const proc = new Process();

        proc.spawn(['echo', '123']);

        proc.on('stdout', (buffer: Buffer) => {
            expect(buffer.toString().trim()).toEqual('123');
            done();
        });
    });
});

describe('Command Tests', () => {
    it('get arguments', () => {
        const filePath = 'foo.fileName';
        const args = [];
        const execPath = '';
        const rootPath = 'foo.rootPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'find').and.returnValue('phpunit');
        spyOn(files, 'tmpfile').and.returnValue(xml);

        const command = new Command(filePath, args, execPath, rootPath, files);

        expect(command.getArguments()).toEqual(['phpunit', filePath, '--log-junit', xml]);

        command.clear();
    });

    it('get arguments with exec path', () => {
        const filePath = 'foo.fileName';
        const args = [];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);

        const command = new Command(filePath, args, execPath, rootPath, files);

        expect(command.getArguments()).toEqual([execPath, filePath, '--log-junit', xml]);

        command.clear();
    });

    it('get arguments with exec path and args', () => {
        const filePath = 'foo.fileName';
        const args = ['--foo', 'bar'];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);

        const command = new Command(filePath, args, execPath, rootPath, files);

        expect(command.getArguments()).toEqual([execPath, filePath, '--log-junit', xml, '--foo', 'bar']);

        command.clear();
    });

    it('get arguments with configuration', () => {
        const filePath = 'foo.fileName';
        const args = [];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);
        spyOn(files, 'exists').and.returnValue(true);

        const command = new Command(filePath, args, execPath, rootPath, files);

        expect(command.getArguments()).toEqual([
            execPath,
            filePath,
            '--log-junit',
            xml,
            '--configuration',
            `${rootPath}/phpunit.xml`,
        ]);

        command.clear();
    });
});

describe('Validator Tests', () => {
    it('validate filename', () => {
        const validator = new Validator();

        expect(validator.fileName('test.php')).toBeTruthy();
        expect(validator.fileName('test.inc')).toBeTruthy();
        expect(validator.fileName('test.bat')).toBeFalsy();
        expect(validator.fileName('test.git.php')).toBeFalsy();
        expect(validator.fileName('test.git.inc')).toBeFalsy();
        expect(validator.fileName('test.git.bat')).toBeFalsy();
    });

    it('validate class name', () => {
        const validator = new Validator();

        expect(validator.className('MyTest.php', 'class MyTest extends TestCase')).toBeTruthy();
        expect(validator.className('MyTest.php', 'class MyTest extends PHPUnit\\Framework\\TestCase')).toBeTruthy();
        expect(validator.className('MyTest.php', 'class MyTest extends PHPUnit_Framework_TestCase')).toBeTruthy();
        expect(validator.className('MyTest.php', 'class MyTest')).toBeFalsy();
        expect(validator.className('MyTest.php', 'class MyTest1 extends TestCase')).toBeFalsy();
    });
});
