import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from '../Configuration';
import type { TestDefinition } from '../PHPUnit';
import { OutputChannelObserver } from './OutputChannelObserver';
import { OutputFormatter } from './Printers';
import { TestResultObserver } from './TestResultObserver';
import { TestRunnerObserverFactory } from './TestRunnerObserverFactory';

describe('TestRunnerObserverFactory', () => {
    let factory: TestRunnerObserverFactory;
    let outputChannel: OutputChannel;
    let configuration: Configuration;
    let outputFormatter: OutputFormatter;

    beforeEach(() => {
        outputChannel = {
            append: vi.fn(),
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
        } as unknown as OutputChannel;
        configuration = { get: vi.fn() } as unknown as Configuration;
        outputFormatter = {
            start: vi.fn(),
            error: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
        } as unknown as OutputFormatter;
        factory = new TestRunnerObserverFactory(outputChannel, configuration, outputFormatter);
    });

    it('should create observers including OutputChannelObserver and TestResultObserver', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const request = { continuous: false } as TestRunRequest;

        const observers = factory.create(queue, testRun, request);

        expect(observers.length).toBe(3);
        expect(observers.some((o) => o instanceof TestResultObserver)).toBe(true);
        expect(observers.some((o) => o instanceof OutputChannelObserver)).toBe(true);
    });

    it('should create a new OutputChannelObserver for each call', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const request = { continuous: false } as TestRunRequest;

        const observers1 = factory.create(queue, testRun, request);
        const observers2 = factory.create(queue, testRun, request);

        const output1 = observers1.find((o) => o instanceof OutputChannelObserver);
        const output2 = observers2.find((o) => o instanceof OutputChannelObserver);

        expect(output1).not.toBe(output2);
    });
});
