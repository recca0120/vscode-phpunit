import { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from './Configuration';
import { Printer } from './Observers';
import { TestRunner } from './PHPUnit';
import { TestCase } from './TestCollection';
import { TestRunnerFactory } from './TestRunnerFactory';

describe('TestRunnerFactory', () => {
    it('should create a TestRunner with observers', () => {
        const outputChannel = {} as OutputChannel;
        const configuration = {} as Configuration;
        const printer = {} as Printer;
        const factory = new TestRunnerFactory(outputChannel, configuration, printer);

        const queue = new Map<TestCase, TestItem>();
        const testRun = { enqueued: jest.fn() } as unknown as TestRun;
        const request = {} as TestRunRequest;

        const runner = factory.create(queue, testRun, request);

        expect(runner).toBeInstanceOf(TestRunner);
    });
});
