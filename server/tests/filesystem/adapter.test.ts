import { Filesystem, FilesystemContract } from '../../src/filesystem';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { OS, os } from '../../src/helpers';
import { tmpdir } from 'os';

function toFileUrl(path: string): string {
    return path.replace(/\\/g, '/').replace(/^(\w):/i, m => {
        return `file:///${m[0].toLowerCase()}%3A`;
    });
}

describe('Filesystem Test', () => {
    it('it should get content from file', async () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, '../fixtures/project/tests/PHPUnitTest.php');
        expect(await files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('it should get content from file url', async () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, '../fixtures/project/tests/PHPUnitTest.php');
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
            expect(await files.which('windows.test.ts', __dirname)).toEqual(resolve(__dirname, 'windows.test.ts'));
            expect(await files.which('cmd.exe')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
            expect(await files.which('cmd')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
            expect(await files.which('ls')).toEqual(resolve(__dirname, '../fixtures/bin/ls'));
        } else {
            files.setSystemPaths(systemPaths.join(':'));
            expect(await files.which('posix.test.ts', __dirname)).toEqual(resolve(__dirname, 'posix.test.ts'));
            expect(await files.which('cmd.exe')).toEqual(resolve(__dirname, '../fixtures/bin/cmd.exe'));
            expect(await files.which('cmd')).toEqual(resolve(__dirname, '../fixtures/bin/cmd'));
            expect(await files.which('ls')).toEqual(resolve(__dirname, '../fixtures/bin/ls'));
        }
    });

    it('it should find up path', async () => {
        const files: FilesystemContract = new Filesystem();
        const root: string = resolve(__dirname, '../fixtures');
        expect(await files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures/project/tests'), root)).toEqual(
            resolve(__dirname, '../fixtures/project/vendor/bin/phpunit')
        );

        expect(await files.findUp('vendor/bin/phpunit', resolve(__dirname, '../fixtures/project'), root)).toEqual(
            resolve(__dirname, '../fixtures/project/vendor/bin/phpunit')
        );

        expect(await files.findUp('vendor/bin/phpunit1', resolve(__dirname, '../fixtures/project'), root)).toEqual('');
    });

    it('it should return random file name with extension', () => {
        const files: FilesystemContract = new Filesystem();
        const dir: string = tmpdir();
        expect(files.tmpfile('php', 'test')).toMatch(
            new RegExp(`${resolve(dir, 'test-').replace(/\\/g, '\\\\')}\\d+\.php$`)
        );
    });

    it('it should delete file', async () => {
        const files: FilesystemContract = new Filesystem();
        const path = resolve(__dirname, 'unlink.txt');
        writeFileSync(path, 'unlink');

        expect(await files.exists(path)).toBeTruthy();
        await files.unlink(path);
        expect(await files.exists(path)).toBeFalsy();
    });

    it('it should convert file to uri', () => {
        const files: FilesystemContract = new Filesystem();
        expect(files.uri('C:\\foo\\bar')).toEqual('file:///c%3A/foo/bar');
        expect(files.uri('/foo/bar')).toEqual('file:///foo/bar');
    });
});
