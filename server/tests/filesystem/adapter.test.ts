import { Filesystem, FilesystemContract } from '../../src/filesystem';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { OS, os } from '../../src/helpers';

function toFileUrl(path: string): string {
    return path.replace(/\\/g, '/').replace(/^(\w):/i, m => {
        return `file:///${m[0].toLowerCase()}%3A`;
    });
}

describe('Filesystem Test', () => {
    it('it should get content from file', async () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(await files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('it should get content from file url', async () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, '../fixtures/PHPUnitTest.php');
        expect(await files.get(toFileUrl(path))).toEqual(readFileSync(path).toString('utf8'));
    });

    it('check file exists', async () => {
        const files: FilesystemContract = new Filesystem();

        expect(await files.exists(resolve(__dirname, '../fixtures/bin/ls'))).toBeTruthy();
        expect(await files.exists(resolve(__dirname, '../fixtures/bin/cmd.exe'))).toBeTruthy();
        expect(await files.exists(resolve(__dirname, '../fixtures/bin/pwd'))).toBeFalsy();
    });

    it('check file url exists', async () => {
        const files: FilesystemContract = new Filesystem();

        expect(await files.exists(toFileUrl(resolve(__dirname, '../fixtures/bin/ls')))).toBeTruthy();
        expect(await files.exists(toFileUrl(resolve(__dirname, '../fixtures/bin/cmd.exe')))).toBeTruthy();
        expect(await files.exists(toFileUrl(resolve(__dirname, '../fixtures/bin/pwd')))).toBeFalsy();
    });

    it('it should find path when path not include path', async () => {
        const files: FilesystemContract = new Filesystem();
        const systemPaths = [resolve(__dirname, '../fixtures/bin'), resolve(__dirname, '../fixtures/usr/bin')];

        if (os() === OS.WIN) {
            files.setSystemPaths(systemPaths.join(';'));
            expect(await files.where('windows.test.ts', __dirname)).toEqual(resolve(__dirname, 'windows.test.ts'));
            expect(await files.where('cmd.exe')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
            expect(await files.where('cmd')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
            expect(await files.where('ls')).toEqual(resolve(__dirname, '../fixtures/bin/ls'));
        } else {
            files.setSystemPaths(systemPaths.join(':'));
            expect(await files.where('posix.test.ts', __dirname)).toEqual(resolve(__dirname, 'posix.test.ts'));
            expect(await files.where('cmd.exe')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
            expect(await files.where('cmd')).toEqual(resolve(__dirname, '../fixtures/bin/cmd'));
            expect(await files.where('ls')).toEqual(resolve(__dirname, '../fixtures/bin/ls'));
        }
    });

    it('it should find up path', async () => {
        const files: FilesystemContract = new Filesystem();
        expect(await files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures/usr/bin'))).toEqual(
            resolve(__dirname, '../fixtures/vendor/bin/phpunit')
        );

        expect(await files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures'))).toEqual(
            resolve(__dirname, '../fixtures/vendor/bin/phpunit')
        );
    });
});
