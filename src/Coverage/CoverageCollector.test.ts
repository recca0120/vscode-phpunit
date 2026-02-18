import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestRun } from 'vscode';
import type { TestRunnerProcess } from '../PHPUnit';
import type {
    CoverageCollector as DomainCoverageCollector,
    FileCoverageData,
} from '../PHPUnit/Coverage';
import { CoverageCollector } from './CoverageCollector';

describe('CoverageCollector', () => {
    let domainCollector: DomainCoverageCollector;
    let collector: CoverageCollector;
    let testRun: TestRun;

    beforeEach(() => {
        domainCollector = { collect: vi.fn() } as unknown as DomainCoverageCollector;
        collector = new CoverageCollector(domainCollector);
        testRun = { addCoverage: vi.fn() } as unknown as TestRun;
    });

    afterEach(() => vi.restoreAllMocks());

    it('extracts clover files from processes and adds coverage to test run', async () => {
        const fakeData: FileCoverageData[] = [
            { filePath: '/app/a.php', covered: 1, total: 2, lines: [] },
            { filePath: '/app/b.php', covered: 2, total: 2, lines: [] },
        ];
        vi.mocked(domainCollector.collect).mockResolvedValue(fakeData);

        const processes = [
            { getCloverFile: () => '/tmp/phpunit-0.xml' },
            { getCloverFile: () => '/tmp/phpunit-1.xml' },
        ] as unknown as TestRunnerProcess[];

        await collector.collect(processes, testRun);

        expect(domainCollector.collect).toHaveBeenCalledWith([
            '/tmp/phpunit-0.xml',
            '/tmp/phpunit-1.xml',
        ]);
        expect(testRun.addCoverage).toHaveBeenCalledTimes(2);
    });

    it('skips when no clover files', async () => {
        vi.mocked(domainCollector.collect).mockResolvedValue([]);
        const processes = [{ getCloverFile: () => undefined }] as unknown as TestRunnerProcess[];

        await collector.collect(processes, testRun);

        expect(domainCollector.collect).toHaveBeenCalledWith([]);
        expect(testRun.addCoverage).not.toHaveBeenCalled();
    });
});
