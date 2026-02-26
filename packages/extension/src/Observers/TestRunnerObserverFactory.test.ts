import { PHPUnitXML, type TestDefinition } from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutputChannel, TestItem, TestRun } from 'vscode';
import type { Configuration } from '../Configuration';
import type { TestCollection } from '../TestCollection/TestCollection';
import { DatasetObserver } from './DatasetObserver';
import { PrinterObserver } from './PrinterObserver';
import { TestResultObserver } from './TestResultObserver';
import { TestRunnerObserverFactory } from './TestRunnerObserverFactory';

describe('TestRunnerObserverFactory', () => {
    let factory: TestRunnerObserverFactory;
    let outputChannel: OutputChannel;

    beforeEach(() => {
        const testCollection = {
            getTestDefinition: vi.fn(),
            resolveDatasetChild: vi.fn(),
        } as unknown as TestCollection;
        outputChannel = {
            append: vi.fn(),
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
        } as unknown as OutputChannel;
        const configuration = { get: vi.fn() } as unknown as Configuration;
        const phpUnitXML = new PHPUnitXML();
        factory = new TestRunnerObserverFactory(
            testCollection,
            outputChannel,
            configuration,
            phpUnitXML,
        );
    });

    it('should create observers including DatasetObserver, TestResultObserver, and PrinterObserver', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const observers = factory.create(queue, testRun);

        expect(observers.length).toBe(6);
        expect(observers.some((o) => o instanceof DatasetObserver)).toBe(true);
        expect(observers.some((o) => o instanceof TestResultObserver)).toBe(true);
        expect(observers.some((o) => o instanceof PrinterObserver)).toBe(true);
    });

    it('should create new instances for each call', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const observers1 = factory.create(queue, testRun);
        const observers2 = factory.create(queue, testRun);

        const output1 = observers1.find((o) => o instanceof PrinterObserver);
        const output2 = observers2.find((o) => o instanceof PrinterObserver);

        expect(output1).not.toBe(output2);
    });
});
