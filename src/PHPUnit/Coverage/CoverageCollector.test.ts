import { rm } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloverParser, type FileCoverageData } from './CloverParser';
import { CoverageCollector } from './CoverageCollector';

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...actual, rm: vi.fn().mockResolvedValue(undefined) };
});

describe('CoverageCollector', () => {
    let cloverParser: CloverParser;
    let collector: CoverageCollector;

    beforeEach(() => {
        cloverParser = new CloverParser();
        collector = new CoverageCollector(cloverParser);
    });

    afterEach(() => vi.restoreAllMocks());

    it('collects parsed coverage data from multiple clover files', async () => {
        const fakeData: FileCoverageData[] = [
            { filePath: '/app/a.php', covered: 1, total: 2, lines: [] },
            { filePath: '/app/b.php', covered: 2, total: 2, lines: [] },
        ];
        vi.spyOn(cloverParser, 'parseClover').mockResolvedValue(fakeData);

        const result = await collector.collect(['/tmp/phpunit-0.xml', '/tmp/phpunit-1.xml']);

        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/phpunit-0.xml');
        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/phpunit-1.xml');
        expect(result).toHaveLength(4);
        expect(rm).toHaveBeenCalledWith('/tmp/phpunit-0.xml', { force: true });
        expect(rm).toHaveBeenCalledWith('/tmp/phpunit-1.xml', { force: true });
    });

    it('returns empty array when no clover files given', async () => {
        const result = await collector.collect([]);

        expect(result).toEqual([]);
        expect(rm).not.toHaveBeenCalled();
    });
});
