import { Command } from '../src/command';
import { Filesystem } from './../src/filesystem';

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

        expect(command.args()).toEqual(['phpunit', '--log-junit', xml, filePath]);

        command.dispose();
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

        expect(command.args()).toEqual([execPath, '--log-junit', xml, filePath]);

        command.dispose();
    });

    it('get arguments with exec path and args', () => {
        const filePath = 'foo.fileName';
        const args = ['--foo', 'bar', '-c', 'bootstrap.php', '-d', 'a=b', '-d', 'b=c', '--colors', 'always'];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const junitPath = 'foo.junitPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);
        spyOn(files, 'exists').and.returnValue(true);

        const command = new Command(filePath, args, execPath, { rootPath, junitPath }, files);

        expect(command.args()).toEqual([
            execPath,
            '-c',
            'bootstrap.php',
            '--colors=always',
            '-d',
            'a=b',
            '-d',
            'b=c',
            '--foo',
            'bar',
            '--log-junit',
            xml,
            filePath,
        ]);

        command.dispose();
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

        expect(command.args()).toEqual([
            execPath,
            '--configuration',
            `${rootPath}/phpunit.xml`,
            '--log-junit',
            xml,
            filePath,
        ]);

        command.dispose();
    });

    it('get arguments with --teamcity', () => {
        const filePath = 'foo.fileName';
        const args = ['--teamcity', '--log-junit', 'test.xml'];
        const execPath = 'foo.execPath';
        const rootPath = 'foo.rootPath';
        const junitPath = 'foo.junitPath';
        const files = new Filesystem();
        const xml = 'foo.xml';
        spyOn(files, 'tmpfile').and.returnValue(xml);
        spyOn(files, 'exists').and.returnValue(true);

        const command = new Command(filePath, args, execPath, { rootPath, junitPath }, files);

        expect(command.args()).toEqual([
            execPath,
            '--configuration',
            `${rootPath}/phpunit.xml`,
            '--teamcity',
            filePath,
        ]);

        command.dispose();
    });
});
