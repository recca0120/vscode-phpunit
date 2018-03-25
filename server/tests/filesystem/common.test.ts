import { Filesystem, POSIX, WINDOWS, FilesystemContract, Common } from '../../src/filesystem';
import { readFileSync } from 'fs';
import { resolve } from 'path';

class FilesystemStub extends Common {
    normalizePath(path: string): string {
        return path;
    }
}

describe('Filesystem Test', () => {
    it('it should get content from file', () => {
        const files: FilesystemContract = new FilesystemStub();
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('it should get content from file with adapter', () => {
        const files: FilesystemContract = new Filesystem(new FilesystemStub());
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });
});
