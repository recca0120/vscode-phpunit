import { JUnitParser, ParserFactory } from '../src/parser';
import { Process, ProcessFactory } from '../src/process';

import { Command } from '../src/command';
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

        spyOn(files, 'find').and.returnValue('phpunit');
        spyOn(parserFactory, 'create').and.returnValue(parser);
        spyOn(processFactory, 'create').and.returnValue(process);
        spyOn(parser, 'parse').and.returnValue(Promise.resolve(tests));
        spyOn(process, 'spawn').and.callFake(() => {
            process.emit('exit');
        });

        const command = new Command(
            'foo.php',
            [],
            '',
            {
                rootPath: '',
            },
            files
        );
        const result = await phpunit.handle(command);

        expect(parser.parse).toHaveBeenCalled();
        expect(process.spawn).toHaveBeenCalled();
        expect(result).toBe(tests);
    });
});
