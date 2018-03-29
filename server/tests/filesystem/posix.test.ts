import { Filesystem, POSIX, FilesystemContract } from '../../src/filesystem';
import { readFileSync } from 'fs';
import { OS, os } from '../../src/helpers';

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
});
