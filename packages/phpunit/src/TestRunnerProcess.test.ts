import { rm } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { fixturePath, phpUnitProject } from '../tests/utils';
import { Configuration } from './Configuration';
import { VAR_WORKSPACE_FOLDER } from './constants';
import { PathReplacer } from './PathReplacer';
import { ProcessBuilder } from './ProcessBuilder/ProcessBuilder';
import { Mode, Xdebug } from './ProcessBuilder/Xdebug';
import { TestRunnerProcess } from './TestRunnerProcess';

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...actual, rm: vi.fn().mockResolvedValue(undefined) };
});

const givenBuilder = (opts?: { cwd?: string; paths?: Record<string, string>; mode?: Mode }) => {
    const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
    const cwd = opts?.cwd ?? phpUnitProject('');
    const options = { cwd };
    const pathReplacer = new PathReplacer(options, opts?.paths ?? {});
    const xdebug = opts?.mode ? new Xdebug(config) : undefined;
    return { builder: new ProcessBuilder(config, options, pathReplacer, xdebug), xdebug };
};

describe('TestRunnerProcess', () => {
    it('run() resolves after abort()', async () => {
        const { builder } = givenBuilder();
        const process = new TestRunnerProcess(builder);

        // biome-ignore lint/suspicious/noExplicitAny: prevent real spawn
        vi.spyOn(process as any, 'execute').mockImplementation(() => {});

        const promise = process.run();
        process.abort();

        await expect(promise).resolves.toBe(true);
    });

    it('readCoverage returns empty array when no cloverFile', async () => {
        const { builder } = givenBuilder();
        const process = new TestRunnerProcess(builder);

        const result = await process.readCoverage();

        expect(result).toEqual([]);
    });

    it('readCoverage parses clover, applies toLocal, and removes file', async () => {
        const remoteCwd = 'C:\\local_disk\\zobo\\Projects\\vscode-php-debug\\vscode-phpunit';
        const localCwd = phpUnitProject('');
        const { builder, xdebug } = givenBuilder({
            cwd: localCwd,
            paths: { [VAR_WORKSPACE_FOLDER]: remoteCwd },
            mode: Mode.coverage,
        });
        await xdebug!.setMode(Mode.coverage);

        const cloverFile = fixturePath('test1.clover.xml');
        xdebug!.setCloverFile(cloverFile);

        const process = new TestRunnerProcess(builder);
        const result = await process.readCoverage();

        expect(rm).toHaveBeenCalledWith(cloverFile, { force: true });
        expect(result.length).toBe(3);
        for (const entry of result) {
            expect(entry.filePath).toContain(localCwd);
            expect(entry.filePath).not.toContain(remoteCwd);
        }
    });
});
