import { Filesystem, WINDOWS, Factory } from '../../src/filesystem';
import { fileUrl, fixturePath, projectPath, pathResolve } from '../helpers';
import { tap } from 'lodash';
import { isWindows } from '../../src/support/helpers';

describe('Filesystem WINDOWS Test', () => {
    const factory = new Factory();

    it('it should normalize path', () => {
        const files: Filesystem = new WINDOWS();

        expect(files.normalizePath('file:///c%3A/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('file:///c:/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('c:\\foo\\bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('c:/foo/bar')).toEqual('c:\\foo\\bar');
        expect(files.normalizePath('file:///c%3A/foo/ba r')).toEqual('c:\\foo\\ba\\ r');
    });

    it('it should check file exists', async () => {
        const files: Filesystem = factory.create();

        expect(await files.exists(fixturePath('bin/ls'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/cmd.bat'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/pwd'))).toBeFalsy();
    });

    it('it should check file exists', async () => {
        const files: Filesystem = factory.create();

        expect(await files.exists(fixturePath('bin/ls'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/cmd.bat'))).toBeTruthy();
        expect(await files.exists(fixturePath('bin/pwd'))).toBeFalsy();
    });

    it('check file url exists', async () => {
        const files: Filesystem = factory.create();

        expect(await files.exists(fileUrl(fixturePath('bin/ls')))).toBeTruthy();
        expect(await files.exists(fileUrl(fixturePath('bin/cmd.bat')))).toBeTruthy();
        expect(await files.exists(fileUrl(fixturePath('bin/pwd')))).toBeFalsy();
    });

    it('it should find path from system path', async () => {
        if (isWindows() === false) {
            return;
        }

        const files: Filesystem = new WINDOWS();
        const systemPaths = [fixturePath('bin'), fixturePath('usr/bin')];
        files.setSystemPaths(systemPaths.join(';'));

        expect(await files.which(__filename, __dirname)).toEqual(pathResolve(__dirname, __filename));
        expect(await files.which('cmd')).toEqual(fixturePath('bin/cmd.bat'));
        expect(await files.which('fail')).toEqual('');
    });

    it('it should find up path', async () => {
        if (isWindows() === false) {
            return;
        }

        const files: Filesystem = new WINDOWS();

        tap(await files.findUp('vendor-stub/bin/phpunit', projectPath('tests')), (path: string) => {
            expect(path).toEqual(projectPath('vendor-stub/bin/phpunit.bat'));
        });

        tap(await files.findUp('vendor-stub/bin/phpunit', projectPath()), (path: string) => {
            expect(path).toEqual(projectPath('vendor-stub/bin/phpunit.bat'));
        });
    });
});
