import { Process, ProcessFactory } from '../../src/command/process';

import { Filesystem } from '../../src/filesystem';
import { JUnitParser } from '../../src/parsers/junit';
import { PHPUnit } from '../../src/command/phpunit';
import { ParserFactory } from '../../src/parsers/parser-factory';
import { resolve as pathResolve } from 'path';

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const parserFactory = new ParserFactory();
        const parser = new JUnitParser();
        const processFactory = new ProcessFactory();
        const process = new Process();
        const files = new Filesystem();
        const phpunit = new PHPUnit(parserFactory, processFactory, files);
        const tests = await parser.parse(pathResolve(__dirname, '..', 'fixtures/junit.xml'));
        const optons = {
            execPath: 'phpunit',
            basePath: pathResolve(__dirname, '..'),
        };

        const path = 'FooTest.php';

        spyOn(files, 'isFile').and.returnValue(true);
        spyOn(files, 'dirname').and.returnValue(__dirname);
        spyOn(files, 'findUp').and.returnValues('phpunit.xml', 'phpunit');

        spyOn(processFactory, 'create').and.returnValue(process);
        spyOn(parserFactory, 'create').and.returnValue(parser);
        spyOn(parser, 'parse').and.returnValue(Promise.resolve(tests));
        spyOn(process, 'spawn').and.returnValue(Promise.resolve(process));

        const result = await phpunit.handle(path, [], optons);

        expect(files.isFile).toHaveBeenCalled();
        expect(files.dirname).toHaveBeenCalled();
        expect(files.findUp).toHaveBeenCalled();
        expect(process.spawn).toHaveBeenCalled();
        expect(parser.parse).toHaveBeenCalled();

        expect(result).toBe(tests);
    });
});
