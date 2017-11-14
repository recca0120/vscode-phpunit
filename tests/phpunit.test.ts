import { JUnitParser, ParserFactory } from '../src/parsers/parser';
import { Process, ProcessFactory } from '../src/process';

import { CommandArguments } from '../src/command-arguments';
import { Filesystem } from './../src/filesystem';
import { PHPUnit } from '../src/phpunit';
import { join } from 'path';

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const parserFactory = new ParserFactory();
        const parser = new JUnitParser();
        const processFactory = new ProcessFactory();
        const process = new Process();
        const phpunit = new PHPUnit(parserFactory, processFactory);
        const tests = await parser.parse(join(__dirname, 'fixtures/junit.xml'));
        const files = new Filesystem();
        const optons = {
            execPath: 'phpunit',
            basePath: __dirname,
        };

        const path = 'FooTest.php';
        const args = new CommandArguments();

        spyOn(files, 'find').and.returnValue('phpunit');
        spyOn(processFactory, 'create').and.returnValue(process);

        spyOn(parserFactory, 'create').and.returnValue(parser);
        spyOn(parser, 'parse').and.returnValue(Promise.resolve(tests));

        spyOn(process, 'spawn').and.returnValue(Promise.resolve(process));

        const result = await phpunit.handle(path, args, optons);

        expect(process.spawn).toHaveBeenCalled();
        expect(parser.parse).toHaveBeenCalled();
        // expect(files.find).toHaveBeenCalled();

        expect(result).toBe(tests);
    });
});
