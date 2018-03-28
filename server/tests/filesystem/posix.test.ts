import { Filesystem, POSIX, FilesystemContract } from '../../src/filesystem';
import { readFileSync } from 'fs';

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
});
