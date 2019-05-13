import { Env, Filesystem } from '../src/Filesystem';
import { fixturePath, projectPath } from './helpers';
import { readFileSync, unlinkSync } from 'fs';

describe('Filesystem', () => {
    const paths = [
        fixturePath('bin').fsPath,
        fixturePath('usr/local/bin').fsPath,
    ];
    const env = new Env(paths, process.platform);
    const files = new Filesystem(env);

    it('get content from file', async () => {
        const uri = projectPath('tests/AssertionsTest.php').fsPath;

        const contents = await files.get(uri);

        expect(contents).toContain(readFileSync(uri).toString());
    });

    it('put content to file', async () => {
        const uri = fixturePath('write-file.txt').fsPath;

        expect(await files.put(uri, 'write file')).toBeTruthy();

        unlinkSync(uri);
    });

    it('which ls', async () => {
        expect(await files.which(['ls.exe', 'ls'])).toBe(
            fixturePath('bin/ls').fsPath
        );
    });

    it('findUp types/php-parser.d.ts', async () => {
        const file = await files.findup('types/php-parser.d.ts', {
            cwd: __filename,
        } as any);

        expect(file).toContain(
            fixturePath('../../types/php-parser.d.ts').fsPath
        );
    });

    it('lineAt', async () => {
        const uri = projectPath('tests/AssertionsTest.php');

        const line = await files.lineAt(uri, 13);

        expect(line).toContain('$this->assertTrue(true);');
    });

    it('lineRange', async () => {
        const uri = projectPath('tests/AssertionsTest.php').fsPath;

        const range = await files.lineRange(uri, 13);

        expect(range).toEqual({
            end: { line: 13, character: 32 },
            start: { line: 13, character: 8 },
        });
    });

    it('lineLocation', async () => {
        const uri = projectPath('tests/AssertionsTest.php');

        const range = await files.lineLocation(uri, 13);

        expect(range).toEqual({
            uri: uri.with({ scheme: 'file' }).toString(),
            range: {
                end: { line: 13, character: 32 },
                start: { line: 13, character: 8 },
            },
        });
    });

    it('glob', async () => {
        const matches = await files.glob('**/*.php', {
            ignore: 'vendor/**',
            cwd: projectPath('').fsPath,
        });

        expect(matches).toEqual([
            'src/Calculator.php',
            'src/Item.php',
            'tests/AbstractTest.php',
            'tests/AssertionsTest.php',
            'tests/bootstrap.php',
            'tests/CalculatorTest.php',
            'tests/Directory/HasPropertyTest.php',
            'tests/Directory/LeadingCommentsTest.php',
            'tests/StaticMethodTest.php',
        ]);
    });

    it('fix wndows path', () => {
        const env = new Env(
            [fixturePath('bin').fsPath, fixturePath('usr/local/bin').fsPath],
            'win32'
        );
        const files = new Filesystem(env);

        const uri = files.asUri('D:\\foo\\bar').with({ scheme: 'file' });

        expect(uri.toString()).toEqual('file:///d%3A/foo/bar');
    });

    it('which cmd.cmd', async () => {
        const env = new Env([fixturePath('usr/local/bin').fsPath], 'win32');
        const files = new Filesystem(env);

        expect(await files.which('cmd')).toBe(
            fixturePath('usr/local/bin/cmd.cmd').fsPath
        );
    });
});
