import { Filesystem, POSIX, Factory } from '../../src/filesystem';
import { fileUrl, fixturePath, projectPath, pathResolve } from '../helpers';
import { tap, isWindows } from '../../src/support/helpers';
import { tmpdir } from 'os';
import { readFileSync, writeFileSync } from 'fs';

describe('Filesystem POSIX Test', () => {
    const factory = new Factory();

    it('it should normalize path', () => {
        const files: Filesystem = new POSIX();

        expect(files.normalizePath('file:///foo/bar')).toEqual('/foo/bar');
        expect(files.normalizePath('file:///foo/ba r')).toEqual('/foo/ba\\ r');
    });

    it('it should check file exists', async () => {
        const files: Filesystem = factory.create();

        expect(await files.exists(fixturePath('bin/ls'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/cmd.bat'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/pwd'))).toBeFalsy();
    });

    it('check file url exists', async () => {
        const files: Filesystem = factory.create();

        expect(await files.exists(fileUrl(fixturePath('bin/ls')))).toBeTruthy();
        expect(await files.exists(fileUrl(fixturePath('bin/cmd.bat')))).toBeTruthy();
        expect(await files.exists(fileUrl(fixturePath('bin/pwd')))).toBeFalsy();
    });

    it('it should find path from system path', async () => {
        if (isWindows() === true) {
            return;
        }

        const files: Filesystem = new POSIX();
        const systemPaths = [fixturePath('bin'), fixturePath('usr/bin')];
        files.setSystemPaths(systemPaths.join(':'));

        expect(await files.which(__filename, __dirname)).toEqual(pathResolve(__dirname, __filename));

        expect(await files.which('cmd.bat')).toEqual(fixturePath('bin/cmd.bat'));
        expect(await files.which('cmd')).toEqual(fixturePath('bin/cmd'));
        expect(await files.which('ls')).toEqual(fixturePath('bin/ls'));
        expect(await files.which('fail')).toEqual('');
    });

    it('it should find up path', async () => {
        const files: Filesystem = new POSIX();

        tap(await files.findUp('vendor-stub/bin/phpunit', projectPath('tests')), (path: string) => {
            expect(path).toEqual(projectPath('vendor-stub/bin/phpunit'));
        });

        tap(await files.findUp('vendor-stub/bin/phpunit', projectPath()), (path: string) => {
            expect(path).toEqual(projectPath('vendor-stub/bin/phpunit'));
        });

        tap(await files.findUp('php-cs-fix', projectPath(), projectPath()), (path: string) => {
            expect(path).toEqual('');
        });

        tap(await files.findUp('vendor-stub/bin/php-cs-fix', projectPath()), (path: string) => {
            expect(path).toEqual('');
        });
    });

    it('it should return dirname', () => {
        const files: Filesystem = new POSIX();

        expect(files.dirname(__filename)).toBe(__dirname);
    });

    it('it should return random file name with extension', () => {
        const files: Filesystem = new POSIX();
        const dir: string = tmpdir();

        expect(files.tmpfile('php', 'test')).toMatch(
            new RegExp(`${pathResolve(dir, 'test-').replace(/\\/g, '\\\\')}\\d+\.php$`, 'i')
        );
    });

    it('it should get contents', async () => {
        const files: Filesystem = new POSIX();

        expect(await files.get(__filename)).toContain(readFileSync(__filename).toString('utf8'));
    });

    it('it should unlink file', async () => {
        const files: Filesystem = new POSIX();

        const file: string = files.tmpfile('php', 'test');
        writeFileSync(file, '');

        expect(await files.exists(file)).toBeTruthy();
        expect(await files.unlink(file)).toBeTruthy();
        expect(await files.exists(file)).toBeFalsy();
    });
});
