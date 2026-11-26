import { PHPUnitXML, type TestDefinition } from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it } from 'vitest';
import { type OutputChannel, type TestItem, TestRunRequest, tests, window } from 'vscode';
import type { Configuration } from '../Configuration';
import type { TestTree } from '../TestTree/TestTree';
import { DatasetObserver } from './DatasetObserver';
import { ObserverFactory } from './ObserverFactory';
import { PrinterObserver } from './PrinterObserver';
import { TestResultObserver } from './TestResultObserver';

describe('ObserverFactory', () => {
    let factory: ObserverFactory;
    let outputChannel: OutputChannel;

    beforeEach(() => {
        const testTree = {
            definitionOf: () => undefined,
            addDatasetChild: () => undefined,
        } satisfies Partial<TestTree> as unknown as TestTree;
        outputChannel = window.createOutputChannel('PHPUnit');
        const configuration = {
            get: () => undefined,
        } satisfies Partial<Configuration> as unknown as Configuration;
        const phpUnitXML = new PHPUnitXML();
        factory = new ObserverFactory(testTree, outputChannel, configuration, phpUnitXML);
    });

    it('should create observers including DatasetObserver, TestResultObserver, and PrinterObserver', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = tests
            .createTestController('phpunit', 'PHPUnit')
            .createTestRun(new TestRunRequest());
        const observers = factory.create(queue, testRun);

        expect(observers.length).toBe(5);
        expect(observers.some((o) => o instanceof DatasetObserver)).toBe(true);
        expect(observers.some((o) => o instanceof TestResultObserver)).toBe(true);
        expect(observers.some((o) => o instanceof PrinterObserver)).toBe(true);
    });

    it('should create new instances for each call', () => {
        const queue = new Map<TestDefinition, TestItem>();
        const testRun = tests
            .createTestController('phpunit', 'PHPUnit')
            .createTestRun(new TestRunRequest());
        const observers1 = factory.create(queue, testRun);
        const observers2 = factory.create(queue, testRun);

        const output1 = observers1.find((o) => o instanceof PrinterObserver);
        const output2 = observers2.find((o) => o instanceof PrinterObserver);

        expect(output1).not.toBe(output2);
    });
});
