import { Filesystem, POSIX, WINDOWS, FilesystemContract, Common } from '../../src/filesystem';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

class FilesystemStub extends Common {
    normalizePath(path: string): string {
        return path;
    }
}

describe('Filesystem Test', () => {
    it('it should get content from file', () => {
        const files: FilesystemContract = new Filesystem(new FilesystemStub());
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('it should get content from file with adapter', () => {
        const files: FilesystemContract = new Filesystem(new FilesystemStub());
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('check file exists', () => {
        const files: FilesystemContract = new Filesystem();

        expect(files.exists(join(__dirname, '../fixtures/bin/ls'))).toBeTruthy();
        expect(files.exists(join(__dirname, '../fixtures/bin/cmd.exe'))).toBeTruthy();
        expect(files.exists(join(__dirname, '../fixtures/bin/cmd'))).toBeFalsy();

        function toFileUrl(path: string): string {
            return path.replace(/\\/g, '/').replace(/^(\w):/i, (m) => {
                return `file:///${m[0].toLowerCase()}%3A`;
            });
        }

        expect(files.exists(toFileUrl(join(__dirname, '../fixtures/bin/ls')))).toBeTruthy();
        expect(files.exists(toFileUrl(join(__dirname, '../fixtures/bin/cmd.exe')))).toBeTruthy();
        expect(files.exists(toFileUrl(join(__dirname, '../fixtures/bin/cmd')))).toBeFalsy();
    });
});
