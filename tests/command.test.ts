import { Command } from '../src/command';
import { Filesystem } from './../src/filesystem';
import { PHPUnit } from '../src/phpunit';
import { Parser } from '../src/parser';
import { Process } from '../src/process';
import { join } from 'path';

describe('Command Tests', () => {
    it('get arguments', () => {
        const filePath = 'foo.fileName';
        const args = [];
        const execPath = '';
        const rootPath = 'foo.rootPath';
        const junitPath = 'foo.junitPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'find').and.returnValue('phpunit');
        spyOn(files, 'tmpfile').and.returnValue(xml);

        const command = new Command(
            filePath,
            args,
            execPath,
            {
                rootPath,
                junitPath,
            },
            files
        );

        expect(command.toArray()).toEqual(['phpunit', '--log-junit', xml, filePath]);

        command.clear();
    });

    it('get arguments with exec path', () => {
        const filePath = 'foo.fileName';
        const args = [];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const junitPath = 'foo.junitPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);

        const command = new Command(filePath, args, execPath, { rootPath, junitPath }, files);

        expect(command.toArray()).toEqual([execPath, '--log-junit', xml, filePath]);

        command.clear();
    });

    it('get arguments with exec path and args', () => {
        const filePath = 'foo.fileName';
        const args = ['--foo', 'bar', '--configuration', 'foo.xml', '-c', 'bootstrap.php', '-d', 'a=b', '-d', 'b=c'];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const junitPath = 'foo.junitPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);
        spyOn(files, 'exists').and.returnValue(true);

        const command = new Command(filePath, args, execPath, { rootPath, junitPath }, files);

        expect(command.toArray()).toEqual([
            execPath,
            '--configuration',
            'foo.xml',
            '--foo',
            'bar',
            '--log-junit',
            xml,
            '-c',
            'bootstrap.php',
            '-d',
            'a=b',
            '-d',
            'b=c',
            filePath,
        ]);

        command.clear();
    });

    it('get arguments with configuration', () => {
        const filePath = 'foo.fileName';
        const args = [];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const junitPath = 'foo.junitPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);
        spyOn(files, 'exists').and.returnValue(true);

        const command = new Command(filePath, args, execPath, { rootPath, junitPath }, files);

        expect(command.toArray()).toEqual([
            execPath,
            '--configuration',
            `${rootPath}/phpunit.xml`,
            '--log-junit',
            xml,
            filePath,
        ]);

        command.clear();
    });
});
