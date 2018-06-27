import { Filesystem, POSIX, Factory } from '../../src/filesystem';
import { resolve } from 'path';
import { fileUrl, fixturePath, projectPath } from '../helpers';
import { tap } from '../../src/helpers';
import { tmpdir } from 'os';

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
        expect(await files.exists(fixturePath('bin/cmd.exe'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/pwd'))).toBeFalsy();
    });

    it('check file url exists', async () => {
        const files: Filesystem = factory.create();

        expect(await files.exists(fileUrl(fixturePath('bin/ls')))).toBeTruthy();
        expect(await files.exists(fileUrl(fixturePath('bin/cmd.exe')))).toBeTruthy();
        expect(await files.exists(fileUrl(fixturePath('bin/pwd')))).toBeFalsy();
    });

    it('it should find path from system path', async () => {
        const files: Filesystem = new POSIX();
        const systemPaths = [fixturePath('bin'), fixturePath('usr/bin')];
        files.setSystemPaths(systemPaths.join(':'));

        expect(await files.which(__filename, __filename)).toEqual(resolve(__dirname, __filename));

        expect(await files.which('cmd.exe')).toEqual(fixturePath('bin/cmd.exe'));
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
            new RegExp(`${resolve(dir, 'test-').replace(/\\/g, '\\\\')}\\d+\.php$`)
        );
    });
});
