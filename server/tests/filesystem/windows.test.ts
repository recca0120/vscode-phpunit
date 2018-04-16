import { Filesystem, FilesystemContract, WINDOWS } from '../../src/filesystem';
import { OS, os } from '../../src/helpers';
import { resolve } from 'path';

describe('Windows Filesystem Test', () => {
    it('it should normalize path', () => {
        const files: FilesystemContract = new WINDOWS();
        expect(files.normalizePath('file:///c%3A/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('file:///c:/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('c:\\foo\\bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('c:/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('file:///c%3A/foo/ba r')).toEqual('c:\\foo\\ba\\ r');
    });

    it('it should normalize path with adapter', () => {
        const files: FilesystemContract = new Filesystem(new WINDOWS());
        expect(files.normalizePath('file:///c%3A/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('file:///c:/foo/bar')).toEqual('c:\\foo\\bar');
    });

    it('it should receive paths from system', () => {
        const files: FilesystemContract = new WINDOWS();
        const systemPaths = ['C:\\WINDOWS\\', 'C:\\Program\\', 'C:\\ProgramData\\'];

        if (os() === OS.WIN) {
            expect(files.getSystemPaths().join(';')).toEqual(process.env.PATH as string);
        }

        files.setSystemPaths(systemPaths.join(';'));
        expect(files.getSystemPaths()).toEqual(systemPaths);
    });

    it('it should find path when path not include path', async () => {
        if (os() !== OS.WIN) {
            return;
        }

        const files: FilesystemContract = new WINDOWS();
        const systemPaths = [resolve(__dirname, '../fixtures/bin'), resolve(__dirname, '../fixtures/usr/bin')];
        files.setSystemPaths(systemPaths.join(';'));

        expect(await files.which('windows.test.ts', __dirname)).toEqual(resolve(__dirname, 'windows.test.ts'));
        expect(await files.which('cmd.exe')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
        expect(await files.which('cmd')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
        expect(await files.which('ls')).toEqual(resolve(__dirname, '../fixtures/bin/ls'));
    });

    it('it should find up path', async () => {
        if (os() !== OS.WIN) {
            return;
        }

        const files: FilesystemContract = new WINDOWS();
        expect(await files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures/project/tests'))).toEqual(
            resolve(__dirname, '../fixtures/project/vendor/bin/phpunit')
        );

        expect(await files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures/project'))).toEqual(
            resolve(__dirname, '../fixtures/project/vendor/bin/phpunit')
        );
    });

    it('it should convert file to uri', () => {
        if (os() !== OS.WIN) {
            return;
        }

        const files: FilesystemContract = new Filesystem();
        expect(files.uri('C:\\foo\\bar')).toEqual('file:///c%3A/foo/bar');
        expect(files.uri('C:\\foo\\ba r')).toEqual('file:///c%3A/foo/ba%20r');
    });
});
