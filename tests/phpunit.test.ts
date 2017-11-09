import { PHPUnit, Process, Validator } from '../src/phpunit';

import { Filesystem } from './../src/filesystem';
import { Parser } from '../src/parser';
import { join } from 'path';

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const fileName = 'MyTest.php';
        const content = 'class MyTest extends TestCase';

        const project = {};
        const parser = new Parser();
        const process = new Process();
        const filesystem = new Filesystem();
        const phpunit = new PHPUnit(project, parser, filesystem, process);
        const tests = await parser.parseXML(join(__dirname, 'fixtures/junit.xml'));
        spyOn(filesystem, 'find').and.returnValue('phpunit');
        spyOn(parser, 'parseXML').and.returnValue(tests);
        spyOn(process, 'spawn').and.callFake(() => {
            process.emit('exit');
        });

        const testCases = await phpunit.run(fileName, content);

        expect(filesystem.find).toHaveBeenCalled();
        expect(parser.parseXML).toHaveBeenCalled();
        expect(process.spawn).toHaveBeenCalled();
        expect(testCases).toBe(tests);
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
