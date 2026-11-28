import { semverGte } from '@vscode-phpunit/phpunit';
import {
    detectParatestStubs,
    detectPestStubs,
    detectPhpUnitStubs,
} from '@vscode-phpunit/phpunit/testing';
import { expect, vi } from 'vitest';
import type { ExtensionContext, TestRunProfileKind } from 'vscode';
import { activateExtension, type Extension } from './harness';

export const stubs = {
    phpUnit: detectPhpUnitStubs(),
    paratest: detectParatestStubs(),
    pest: detectPestStubs(),
};

export const methodFilter = (method: string) =>
    new RegExp(
        `--filter=["']?/\\^\\.\\*::\\(${method}\\)\\(\\( with \\(data set \\)\\?\\.\\*\\)\\?\\)\\?\\$/["']?`,
    );

export const byVersion = <T>(version: string, map: [string, T][], fallback: T): T => {
    for (const [minVersion, expected] of map) {
        if (semverGte(version, minVersion)) return expected;
    }
    return fallback;
};

export const activateAndRun = async (
    context: ExtensionContext,
    opts?: { include?: string | string[]; kind?: TestRunProfileKind },
) => {
    const extension = await activateExtension(context);
    await extension.run(opts?.include, { kind: opts?.kind });
    return extension;
};

export const expectTestResultCalled = (extension: Extension, expected: Record<string, number>) => {
    const { enqueued, started, passed, failed, errored, end } = vi.mocked(extension.testRuns()[0]);

    expect({
        enqueued: enqueued.mock.calls.length,
        started: started.mock.calls.length,
        passed: passed.mock.calls.length,
        failed: failed.mock.calls.length + errored.mock.calls.length,
        end: end.mock.calls.length,
    }).toEqual(expected);

    expect(extension.outputChannel.appendLine).toHaveBeenCalled();
};
