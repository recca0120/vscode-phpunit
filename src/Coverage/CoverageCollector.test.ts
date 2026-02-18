import { rm } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestRun } from 'vscode';
import type { TestRunnerProcess } from '../PHPUnit';
import { CloverParser, type FileCoverageData } from '../PHPUnit/Coverage';
import { CoverageCollector } from './CoverageCollector';

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...actual, rm: vi.fn().mockResolvedValue(undefined) };
});

describe('CoverageCollector', () => {
    let cloverParser: CloverParser;
    let collector: CoverageCollector;
    let testRun: TestRun;

    beforeEach(() => {
        cloverParser = new CloverParser();
        collector = new CoverageCollector(cloverParser);
        testRun = { addCoverage: vi.fn() } as unknown as TestRun;
    });

    afterEach(() => vi.restoreAllMocks());

    it('should parse clover files and add coverage to test run', async () => {
        const fakeData: FileCoverageData[] = [
            { filePath: '/app/a.php', covered: 1, total: 2, lines: [] },
            { filePath: '/app/b.php', covered: 2, total: 2, lines: [] },
        ];
        vi.spyOn(cloverParser, 'parseClover').mockResolvedValue(fakeData);

        const processes = [
            { getCloverFile: () => '/tmp/phpunit-0.xml' },
            { getCloverFile: () => '/tmp/phpunit-1.xml' },
        ] as unknown as TestRunnerProcess[];

        await collector.collect(processes, testRun);

        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/phpunit-0.xml');
        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/phpunit-1.xml');
        expect(testRun.addCoverage).toHaveBeenCalledTimes(4);
        expect(rm).toHaveBeenCalledWith('/tmp/phpunit-0.xml', { force: true });
        expect(rm).toHaveBeenCalledWith('/tmp/phpunit-1.xml', { force: true });
    });

    it('should skip when no clover files', async () => {
        const processes = [{ getCloverFile: () => undefined }] as unknown as TestRunnerProcess[];

        await collector.collect(processes, testRun);

        expect(testRun.addCoverage).not.toHaveBeenCalled();
        expect(rm).not.toHaveBeenCalled();
    });
});
