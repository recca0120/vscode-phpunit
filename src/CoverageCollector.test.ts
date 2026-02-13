import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import { TestRun } from 'vscode';
import { CloverParser } from './CloverParser';
import { CoverageCollector } from './CoverageCollector';

vi.mock('node:fs/promises', () => ({
    rm: vi.fn().mockResolvedValue(undefined),
}));

describe('CoverageCollector', () => {
    let collector: CoverageCollector;
    let testRun: TestRun;

    beforeEach(() => {
        collector = new CoverageCollector();
        testRun = { addCoverage: vi.fn() } as unknown as TestRun;
    });

    afterEach(() => vi.restoreAllMocks());

    it('should parse clover files and add coverage to test run', async () => {
        const fakeCoverage = [{ file: 'a.php' }, { file: 'b.php' }];
        vi.spyOn(CloverParser, 'parseClover').mockResolvedValue(fakeCoverage as any);

        const processes = [
            { getCloverFile: () => '/tmp/coverage/phpunit-0.xml' },
            { getCloverFile: () => '/tmp/coverage/phpunit-1.xml' },
        ] as any;

        await collector.collect(processes, testRun);

        expect(CloverParser.parseClover).toHaveBeenCalledWith('/tmp/coverage/phpunit-0.xml');
        expect(CloverParser.parseClover).toHaveBeenCalledWith('/tmp/coverage/phpunit-1.xml');
        expect(testRun.addCoverage).toHaveBeenCalledTimes(4);
        expect(rm).toHaveBeenCalledWith('/tmp/coverage', { recursive: true, force: true });
    });

    it('should skip when no clover files', async () => {
        const processes = [
            { getCloverFile: () => undefined },
        ] as any;

        await collector.collect(processes, testRun);

        expect(testRun.addCoverage).not.toHaveBeenCalled();
        expect(rm).not.toHaveBeenCalled();
    });
});
