import { Filesystem, POSIX, FilesystemContract } from '../../src/filesystem';
import { readFileSync } from 'fs';
import { OS, os } from '../../src/helpers';
import { resolve, join } from 'path';
import { spawnSync } from 'child_process';

describe('POSIX Filesystem Test', () => {
    it('it should normalize path', () => {
        const files: FilesystemContract = new POSIX();
        expect(files.normalizePath('file:///foo/bar')).toEqual('/foo/bar');
        expect(files.normalizePath('file:///foo/ba r')).toEqual('/foo/ba\\ r');
    });

    it('it should normalize path with adapter', () => {
        const files: FilesystemContract = new Filesystem(new POSIX());
        expect(files.normalizePath('file:///foo/bar')).toEqual('/foo/bar');
    });

    it('it should receive paths from system', () => {
        const files: FilesystemContract = new POSIX();
        const systemPaths = ['/bin', '/usr/bin', '/usr/local/bin'];

        if (os() === OS.POSIX) {
            expect(files.getSystemPaths().join(':')).toEqual(process.env.PATH as string);
        }

        files.setSystemPaths(systemPaths.join(':'));
        expect(files.getSystemPaths()).toEqual(systemPaths);
    });

    it('it should find path when path not include path', () => {
        const files: FilesystemContract = new POSIX();
        const systemPaths = [resolve(__dirname, '../fixtures/bin'), resolve(__dirname, '../fixtures/usr/bin')];
        files.setSystemPaths(systemPaths.join(';'));

        expect(files.where('posix.test.ts', __dirname)).toEqual(resolve(__dirname, 'posix.test.ts'));
        expect(files.where('cmd.exe')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
        expect(files.where('cmd')).toEqual(resolve(__dirname, '../fixtures/bin/cmd'));
        expect(files.where('ls')).toEqual(resolve(__dirname, '../fixtures/bin/ls'));
    });

    it('it should find up path', () => {
        const files: FilesystemContract = new POSIX();
        expect(files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures/usr/bin'))).toEqual(
            resolve(__dirname, '../fixtures/vendor/bin/phpunit')
        );
    });
});
