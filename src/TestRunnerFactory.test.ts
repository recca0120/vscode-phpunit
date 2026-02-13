import { TestItem, TestRun, TestRunRequest } from 'vscode';
import { MessageObserver, OutputChannelObserver } from './Observers';
import { TestRunner } from './PHPUnit';
import { TestCase } from './TestCollection';
import { TestRunnerFactory } from './TestRunnerFactory';

describe('TestRunnerFactory', () => {
    it('should create a TestRunner with observers', () => {
        const outputChannelObserver = { setRequest: jest.fn() } as unknown as OutputChannelObserver;
        const messageObserver = {} as MessageObserver;
        const factory = new TestRunnerFactory(outputChannelObserver, messageObserver);

        const queue = new Map<TestCase, TestItem>();
        const testRun = { enqueued: jest.fn() } as unknown as TestRun;
        const request = {} as TestRunRequest;

        const runner = factory.create(queue, testRun, request);

        expect(runner).toBeInstanceOf(TestRunner);
        expect(outputChannelObserver.setRequest).toHaveBeenCalledWith(request);
    });
});
