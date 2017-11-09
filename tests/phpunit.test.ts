import { Process, ProcessFactory } from '../src/process';

import { Command } from '../src/command';
import { Filesystem } from './../src/filesystem';
import { PHPUnit } from '../src/phpunit';
import { Parser } from '../src/parser';
import { join } from 'path';

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const parser = new Parser();
        const processFactory = new ProcessFactory();
        const process = new Process();
        const phpunit = new PHPUnit(parser, processFactory);
        const tests = await parser.parseXML(join(__dirname, 'fixtures/junit.xml'));
        const files = new Filesystem();

        spyOn(files, 'find').and.returnValue('phpunit');
        spyOn(processFactory, 'create').and.returnValue(process);
        spyOn(parser, 'parseXML').and.returnValue(Promise.resolve(tests));
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

        expect(parser.parseXML).toHaveBeenCalled();
        expect(process.spawn).toHaveBeenCalled();
        expect(result).toBe(tests);
    });
});
