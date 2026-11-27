import { type ChildProcess, spawn } from 'node:child_process';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CancellationTokenSource, type ExtensionContext, type TestItem, window } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace } from '../../fakes/openWorkspace';
import { findItem } from '../../test-support/testItems';
import { activateExtension } from './harness';

let context: ExtensionContext;

beforeAll(async () => initTreeSitter());

beforeEach(() => {
    context = createExtensionContext();
});

describe('cancellation', () => {
    const root = phpUnitProject('');

    beforeEach(async () => {
        await openWorkspace({
            root,
            settings: { php: 'php', phpunit: 'vendor/bin/phpunit', args: [] },
        });
    });

    afterEach(() => vi.clearAllMocks());

    it('stops starting processes once the run is cancelled', async () => {
        const cancellation = new CancellationTokenSource();
        const spawnSpy = vi.mocked(spawn);
        const originalSpawn = spawnSpy.getMockImplementation();
        if (!originalSpawn) {
            throw new Error('Mock implementation not found');
        }

        spawnSpy.mockImplementation((...args: Parameters<typeof spawn>) => {
            cancellation.cancel();
            return originalSpawn(...args) as ChildProcess;
        });

        try {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const include = ['Assertions (Tests\\Assertions)', 'Calculator (Tests\\Calculator)']
                .map((id) => findItem(controller.items, id))
                .filter((item): item is TestItem => item !== undefined);

            expect(include).toHaveLength(2);

            spawnSpy.mockClear();
            await extension.run(include, { token: cancellation.token });

            expect(cancellation.token.isCancellationRequested).toBe(true);
            expect(spawn).toHaveBeenCalledTimes(1);
        } finally {
            spawnSpy.mockImplementation(originalSpawn);
        }
    });

    it('marks the tests that did not run as skipped without an error dialog', async () => {
        const cancellation = new CancellationTokenSource();
        const spawnSpy = vi.mocked(spawn);
        const originalSpawn = spawnSpy.getMockImplementation();
        if (!originalSpawn) {
            throw new Error('Mock implementation not found');
        }

        spawnSpy.mockImplementation((...args: Parameters<typeof spawn>) => {
            cancellation.cancel();
            return originalSpawn(...args) as ChildProcess;
        });
        window.showErrorMessage = vi.fn();

        try {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const item = findItem(controller.items, 'Assertions (Tests\\Assertions)');
            if (!item) {
                throw new Error('Test item not found');
            }

            await extension.run([item], { token: cancellation.token });

            expect(extension.testRuns()[0].skipped).toHaveBeenCalled();
            expect(window.showErrorMessage).not.toHaveBeenCalled();
        } finally {
            spawnSpy.mockImplementation(originalSpawn);
        }
    });
});
