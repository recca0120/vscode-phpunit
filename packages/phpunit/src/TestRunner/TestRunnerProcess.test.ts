import { rm } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { fixturePath, phpUnitProject } from '../../tests/support/fixtures';
import { Configuration } from '../Configuration';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import { RemotePathMapper } from '../Path';
import { Mode, Xdebug } from '../TestCommand/Option/Xdebug';
import { TestCommand } from '../TestCommand/TestCommand';
import { TestRunnerProcess } from './TestRunnerProcess';

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...actual, rm: vi.fn().mockResolvedValue(undefined) };
});

const givenCommand = async (opts?: {
    cwd?: string;
    paths?: Record<string, string>;
    mode?: Mode;
}) => {
    const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
    const cwd = opts?.cwd ?? phpUnitProject('');
    const options = { cwd };
    const remotePathMapper = new RemotePathMapper(options, opts?.paths ?? {});
    const xdebug = opts?.mode ? await new Xdebug(config).setMode(opts.mode) : undefined;
    return { command: new TestCommand(config, options, remotePathMapper, xdebug?.options()) };
};

describe('TestRunnerProcess', () => {
    it('run() resolves after abort()', async () => {
        const { command } = await givenCommand();
        const process = new TestRunnerProcess(command);

        // biome-ignore lint/suspicious/noExplicitAny: prevent real spawn
        vi.spyOn(process as any, 'execute').mockImplementation(() => {});

        const promise = process.run();
        process.abort();

        await expect(promise).resolves.toBe(true);
    });

    it('readCoverage returns empty array when no cloverFile', async () => {
        const { command } = await givenCommand();
        const process = new TestRunnerProcess(command);

        const result = await process.readCoverage();

        expect(result).toEqual([]);
    });

    it('readCoverage parses clover, applies toLocal, and removes file', async () => {
        const remoteCwd = 'C:\\local_disk\\zobo\\Projects\\vscode-php-debug\\vscode-phpunit';
        const localCwd = phpUnitProject('');
        const { command } = await givenCommand({
            cwd: localCwd,
            paths: { [VAR_WORKSPACE_FOLDER]: remoteCwd },
            mode: Mode.coverage,
        });

        const cloverFile = fixturePath('test1.clover.xml');

        const process = new TestRunnerProcess(command.withCoverageClover(cloverFile));
        const result = await process.readCoverage();

        expect(rm).toHaveBeenCalledWith(cloverFile, { force: true });
        expect(result.length).toBe(3);
        for (const entry of result) {
            expect(entry.filePath).toContain(localCwd);
            expect(entry.filePath).not.toContain(remoteCwd);
        }
    });
});
