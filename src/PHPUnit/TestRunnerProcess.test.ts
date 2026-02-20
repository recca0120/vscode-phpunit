import { rm } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import type { PathReplacer } from './PathReplacer';
import type { CloverParser } from './TestCoverage';
import { TestRunnerProcess } from './TestRunnerProcess';

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...actual, rm: vi.fn().mockResolvedValue(undefined) };
});

describe('TestRunnerProcess', () => {
    it('run() resolves after abort()', async () => {
        const builder = {
            build: () => ({ runtime: 'echo', args: ['hello'], options: {} }),
            getXdebug: () => undefined,
        };

        const process = new TestRunnerProcess(
            // biome-ignore lint/suspicious/noExplicitAny: test stub
            builder as any,
        );

        // biome-ignore lint/suspicious/noExplicitAny: test stub
        vi.spyOn(process as any, 'execute').mockImplementation(() => {});

        const promise = process.run();
        process.abort();

        await expect(promise).resolves.toBe(true);
    });

    it('readCoverage returns empty array when no cloverParser', async () => {
        const builder = {
            getXdebug: () => undefined,
            getPathReplacer: () => ({}) as PathReplacer,
        };
        const process = new TestRunnerProcess(
            // biome-ignore lint/suspicious/noExplicitAny: test stub
            builder as any,
        );

        const result = await process.readCoverage();

        expect(result).toEqual([]);
    });

    it('readCoverage returns empty array when no cloverFile', async () => {
        const cloverParser = { parseClover: vi.fn() } as unknown as CloverParser;
        const builder = {
            getXdebug: () => ({ getCloverFile: () => undefined }),
            getPathReplacer: () => ({}) as PathReplacer,
        };
        const process = new TestRunnerProcess(
            // biome-ignore lint/suspicious/noExplicitAny: test stub
            builder as any,
            cloverParser,
        );

        const result = await process.readCoverage();

        expect(result).toEqual([]);
        expect(cloverParser.parseClover).not.toHaveBeenCalled();
    });

    it('readCoverage parses clover, applies toLocal, and removes file', async () => {
        const pathReplacer = {
            toLocal: vi.fn((p: string) => p.replace('/app', '/local')),
        } as unknown as PathReplacer;

        const cloverParser = {
            parseClover: vi
                .fn()
                .mockResolvedValue([
                    { filePath: '/app/src/Foo.php', covered: 1, total: 2, lines: [] },
                ]),
        } as unknown as CloverParser;

        const builder = {
            getXdebug: () => ({ getCloverFile: () => '/tmp/coverage-0.xml' }),
            getPathReplacer: () => pathReplacer,
        };

        const process = new TestRunnerProcess(
            // biome-ignore lint/suspicious/noExplicitAny: test stub
            builder as any,
            cloverParser,
        );

        const result = await process.readCoverage();

        expect(cloverParser.parseClover).toHaveBeenCalledWith('/tmp/coverage-0.xml');
        expect(rm).toHaveBeenCalledWith('/tmp/coverage-0.xml', { force: true });
        expect(result).toEqual([
            { filePath: '/local/src/Foo.php', covered: 1, total: 2, lines: [] },
        ]);
    });
});
