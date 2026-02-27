import type { ProcessBuilder } from '../ProcessBuilder';
import { TestOutputParser, type TestResult } from '../TestOutput';
import {
    createTestRunnerEventProxy,
    type EventResultMap,
    TestRunnerEvent,
    type TestRunnerEventProxy,
    type TestRunnerObserver,
} from './TestRunnerObserver';
import { TestRunnerProcess } from './TestRunnerProcess';

export class TestRunner {
    private readonly defaultObserver: TestRunnerEventProxy;
    private readonly testOutputParser = new TestOutputParser();
    private readonly teamcityPattern = /##teamcity\[/i;
    private observers: TestRunnerObserver[] = [];
    private closed = false;

    constructor() {
        this.defaultObserver = createTestRunnerEventProxy();
        this.observe(this.defaultObserver);
    }

    observe(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on<K extends keyof EventResultMap>(
        eventName: K,
        callback: (result: EventResultMap[K]) => void,
    ): this {
        this.defaultObserver.on(eventName, callback);

        return this;
    }

    run(builder: ProcessBuilder) {
        this.closed = false;
        const process = new TestRunnerProcess(builder);

        process.on('start', (builder: ProcessBuilder) => this.emit(TestRunnerEvent.run, builder));
        process.on('line', (line: string) => this.processLine(line, builder));
        process.on('error', (err: Error) => this.handleProcessError(err));
        process.on('close', (code: number | null, output: string) =>
            this.handleProcessClose(code, output),
        );

        return process;
    }

    emit<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]) {
        for (const observer of this.observers) {
            const handler = observer[eventName] as
                | ((result: EventResultMap[K]) => void)
                | undefined;
            handler?.call(observer, result);
        }
    }

    private handleProcessError(err: Error) {
        this.closed = true;
        const error = err.stack ?? err.message;
        this.emit(TestRunnerEvent.error, error);
        this.emit(TestRunnerEvent.close, 2);
    }

    private handleProcessClose(code: number | null, output: string) {
        if (this.closed) {
            return;
        }
        const eventName = this.teamcityPattern.test(output)
            ? TestRunnerEvent.output
            : TestRunnerEvent.error;
        this.emit(eventName, output);
        this.emit(TestRunnerEvent.close, code);
    }

    private processLine(line: string, builder: ProcessBuilder) {
        this.emitTestResult(builder, this.testOutputParser.parse(line));
        this.emit(TestRunnerEvent.line, line);
    }

    private emitTestResult(builder: ProcessBuilder, result: TestResult | undefined) {
        if (!result) {
            return;
        }

        result = builder.replacePath(result);
        if ('event' in result) {
            this.emit(result.event, result);
        }
        this.emit(TestRunnerEvent.result, result);
    }
}
