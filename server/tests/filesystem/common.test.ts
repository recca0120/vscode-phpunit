import { Filesystem, FilesystemContract } from '../../src/filesystem';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function toFileUrl(path: string): string {
    return path.replace(/\\/g, '/').replace(/^(\w):/i, m => {
        return `file:///${m[0].toLowerCase()}%3A`;
    });
}

describe('Filesystem Test', () => {
    it('it should get content from file', () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('it should get content from file url', () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(files.get(toFileUrl(path))).toEqual(readFileSync(path).toString('utf8'));
    });

    it('check file exists', () => {
        const files: FilesystemContract = new Filesystem();

        expect(files.exists(resolve(__dirname, '../fixtures/bin/ls'))).toBeTruthy();
        expect(files.exists(resolve(__dirname, '../fixtures/bin/cmd.exe'))).toBeTruthy();
        expect(files.exists(resolve(__dirname, '../fixtures/bin/pwd'))).toBeFalsy();
    });

    it('check file url exists', () => {
        const files: FilesystemContract = new Filesystem();

        expect(files.exists(toFileUrl(resolve(__dirname, '../fixtures/bin/ls')))).toBeTruthy();
        expect(files.exists(toFileUrl(resolve(__dirname, '../fixtures/bin/cmd.exe')))).toBeTruthy();
        expect(files.exists(toFileUrl(resolve(__dirname, '../fixtures/bin/pwd')))).toBeFalsy();
    });
});
