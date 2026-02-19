import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { phpUnitProjectWin } from '../__tests__/utils';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import { PathReplacer } from '../PathReplacer';
import { CloverParser, type FileCoverageData } from './CloverParser';
import { CoverageReader } from './CoverageReader';

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return {
        ...actual,
        mkdir: vi.fn().mockResolvedValue(undefined),
        rm: vi.fn().mockResolvedValue(undefined),
    };
});

describe('CoverageReader', () => {
    let cloverParser: CloverParser;
    let reader: CoverageReader;

    beforeEach(() => {
        cloverParser = new CloverParser();
        reader = new CoverageReader('/workspace', cloverParser, new PathReplacer());
    });

    afterEach(() => vi.restoreAllMocks());

    it('prepare creates .phpunit.cache directory', async () => {
        await reader.prepare();

        expect(mkdir).toHaveBeenCalledWith(join('/workspace', '.phpunit.cache'), {
            recursive: true,
        });
    });

    it('generateCloverPath returns path with runId and index', async () => {
        await reader.prepare();

        expect(reader.generateCloverPath(0)).toMatch(
            /[/\\]\.phpunit\.cache[/\\]coverage-.+-0\.xml$/,
        );
    });

    it('generateCloverPath uses index for uniqueness within a run', async () => {
        await reader.prepare();

        expect(reader.generateCloverPath(0)).not.toBe(reader.generateCloverPath(1));
    });

    it('prepare generates new runId on each call', async () => {
        await reader.prepare();
        const path1 = reader.generateCloverPath(0);

        await reader.prepare();
        const path2 = reader.generateCloverPath(0);

        expect(path1).not.toBe(path2);
    });

    it('reads parsed coverage data from multiple clover files', async () => {
        const fakeData: FileCoverageData[] = [
            { filePath: '/app/a.php', covered: 1, total: 2, lines: [] },
            { filePath: '/app/b.php', covered: 2, total: 2, lines: [] },
        ];
        vi.spyOn(cloverParser, 'parseClover').mockResolvedValue(fakeData);

        const result = await reader.read(['/tmp/phpunit-0.xml', '/tmp/phpunit-1.xml']);

        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/phpunit-0.xml');
        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/phpunit-1.xml');
        expect(result).toHaveLength(4);
        expect(rm).toHaveBeenCalledWith('/tmp/phpunit-0.xml', { force: true });
        expect(rm).toHaveBeenCalledWith('/tmp/phpunit-1.xml', { force: true });
    });

    it('returns empty array when no clover files given', async () => {
        const result = await reader.read([]);

        expect(result).toEqual([]);
        expect(rm).not.toHaveBeenCalled();
    });

    it('applies pathReplacer.toLocal to file paths', async () => {
        const pathReplacer = new PathReplacer(
            { cwd: '/local/workspace' },
            { [VAR_WORKSPACE_FOLDER]: '/app' },
        );
        reader = new CoverageReader('/local/workspace', cloverParser, pathReplacer);

        const fakeData: FileCoverageData[] = [
            { filePath: '/app/src/Foo.php', covered: 1, total: 2, lines: [] },
        ];
        vi.spyOn(cloverParser, 'parseClover').mockResolvedValue(fakeData);

        const result = await reader.read(['/tmp/phpunit-0.xml']);

        expect(result[0].filePath).toBe('/local/workspace/src/Foo.php');
    });

    it('applies pathReplacer.toLocal to Windows file paths', async () => {
        const pathReplacer = new PathReplacer(
            { cwd: phpUnitProjectWin('') },
            { [VAR_WORKSPACE_FOLDER]: '/app' },
        );
        reader = new CoverageReader(phpUnitProjectWin(''), cloverParser, pathReplacer);

        const fakeData: FileCoverageData[] = [
            { filePath: '/app/src/Foo.php', covered: 1, total: 2, lines: [] },
        ];
        vi.spyOn(cloverParser, 'parseClover').mockResolvedValue(fakeData);

        const result = await reader.read(['/tmp/phpunit-0.xml']);

        expect(result[0].filePath).toBe(phpUnitProjectWin('src/Foo.php'));
    });
});
