import { Process, ProcessFactory } from '../../src/command/process';

import { Arguments } from '../../src/command/arguments';
import { Filesystem } from '../../src/filesystem';
import { JUnitParser } from '../../src/parsers/junit';
import { PHPUnit } from '../../src/command/phpunit';
import { ParserFactory } from '../../src/parsers/parser-factory';
import { resolve as pathJoin } from 'path';

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const parserFactory = new ParserFactory();
        const parser = new JUnitParser();
        const processFactory = new ProcessFactory();
        const process = new Process();
        const phpunit = new PHPUnit(parserFactory, processFactory);
        const tests = await parser.parse(pathJoin(__dirname, '..', 'fixtures/junit.xml'));
        const files = new Filesystem();
        const optons = {
            execPath: 'phpunit',
            basePath: pathJoin(__dirname, '..'),
        };

        const path = 'FooTest.php';
        const args = new Arguments();

        spyOn(processFactory, 'create').and.returnValue(process);

        spyOn(parserFactory, 'create').and.returnValue(parser);
        spyOn(parser, 'parse').and.returnValue(Promise.resolve(tests));

        spyOn(process, 'spawn').and.returnValue(Promise.resolve(process));

        const result = await phpunit.handle(path, args, optons);

        expect(process.spawn).toHaveBeenCalled();
        expect(parser.parse).toHaveBeenCalled();

        expect(result).toBe(tests);
    });
});
