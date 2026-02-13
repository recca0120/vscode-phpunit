import { TestItem, TestRun, TestRunRequest } from 'vscode';
import { ErrorDialogObserver, OutputChannelObserver } from './Observers';
import { TestRunner } from './PHPUnit';
import { TestCase } from './TestCollection';
import { TestRunnerBuilder } from './TestRunnerBuilder';

describe('TestRunnerBuilder', () => {
    it('should build a TestRunner with observers', () => {
        const outputChannelObserver = { setRequest: vi.fn() } as unknown as OutputChannelObserver;
        const errorDialogObserver = {} as ErrorDialogObserver;
        const builder = new TestRunnerBuilder(outputChannelObserver, errorDialogObserver);

        const queue = new Map<TestCase, TestItem>();
        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const request = {} as TestRunRequest;

        const runner = builder.build(queue, testRun, request);

        expect(runner).toBeInstanceOf(TestRunner);
        expect(outputChannelObserver.setRequest).toHaveBeenCalledWith(request);
    });
});
