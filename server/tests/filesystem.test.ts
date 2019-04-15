import { join } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import { Filesystem, Env } from '../src/filesystem';

describe('filesystem tests', () => {
    const systemPath = new Env(
        [
            join(__dirname, 'fixtures', 'bin'),
            join(__dirname, 'fixtures', 'usr', 'local', 'bin'),
        ].join(':'),
        ':'
    );

    const files = new Filesystem(systemPath);

    it('get content from file', async () => {
        const uri = join(
            __dirname,
            'fixtures',
            'project-sub',
            'tests',
            'AssertionsTest.php'
        );

        const contents = await files.get(uri);

        expect(contents).toContain(readFileSync(uri).toString());
    });

    it('put content to file', async () => {
        const uri = join(__dirname, 'fixtures', 'write-file.txt');

        expect(await files.put(uri, 'write file')).toBeTruthy();

        unlinkSync(uri);
    });

    it('which ls', async () => {
        expect(await files.which('ls')).toBe(
            join(__dirname, 'fixtures', 'usr', 'local', 'bin', 'ls')
        );
    });

    it('which ls.cmd', async () => {
        const systemPath = new Env(
            [
                join(__dirname, 'fixtures', 'bin'),
                join(__dirname, 'fixtures', 'usr', 'local', 'bin'),
            ].join(';'),
            ';',
            ['.cmd']
        );
        const files = new Filesystem(systemPath);
        expect(await files.which('ls')).toBe(
            join(__dirname, 'fixtures', 'bin', 'ls.cmd')
        );
    });
});
