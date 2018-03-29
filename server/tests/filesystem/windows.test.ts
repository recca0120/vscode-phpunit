import { WINDOWS, FilesystemContract, Filesystem } from '../../src/filesystem';
import { OS, os } from '../../src/helpers';

describe('Windows Filesystem Test', () => {
    it('it should normalize path', () => {
        const files: FilesystemContract = new WINDOWS();
        expect(files.normalizePath('file:///c%3A/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('c:\\foo\\bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('c:/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('file:///c%3A/foo/ba r')).toEqual('c:\\foo\\ba\\ r');
    });

    it('it should normalize path with adapter', () => {
        const files: FilesystemContract = new Filesystem(new WINDOWS());
        expect(files.normalizePath('file:///c%3A/foo/bar')).toEqual('c:\\foo\\bar');
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
});
