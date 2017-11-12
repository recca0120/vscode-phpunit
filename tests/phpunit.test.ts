import { JUnitParser, ParserFactory } from '../src/parser';
import { Process, ProcessFactory } from '../src/process';

import { CommandOptions } from '../src/command-options';
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
        const execPath = 'phpunit';

        const path = 'FooTest.php';
        const options = new CommandOptions();

        spyOn(files, 'find').and.returnValue('phpunit');
        spyOn(processFactory, 'create').and.returnValue(process);

        spyOn(parserFactory, 'create').and.returnValue(parser);
        spyOn(parser, 'parse').and.returnValue(Promise.resolve(tests));

        spyOn(process, 'spawn').and.returnValue(Promise.resolve(process));

        const result = await phpunit.handle(path, options, execPath);

        expect(process.spawn).toHaveBeenCalled();
        expect(parser.parse).toHaveBeenCalled();
        // expect(files.find).toHaveBeenCalled();

        expect(result).toBe(tests);
    });
});
