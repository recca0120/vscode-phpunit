import { spawn } from 'child_process';
import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { ProcessBuilder } from './ProcessBuilder';
import { ProblemMatcher, TeamcityEvent, TestResult } from './ProblemMatcher';
import { EventResultMap, TestRunnerEvent, TestRunnerEventProxy, TestRunnerObserver } from './TestRunnerObserver';

export class TestRunnerProcess {
    private child?: ChildProcess;
    private emitter = new EventEmitter();
    private output = '';
    private incompleteLineBuffer = '';
    private abortController: AbortController;

    constructor(private builder: ProcessBuilder) {
        this.abortController = new AbortController();
    }

    on(eventName: string, callback: (...args: any[]) => void) {
        this.emitter.on(eventName, callback);

        return this;
    }

    emit(eventName: string, ...args: any[]) {
        this.emitter.emit(eventName, ...args);
    }

    run() {
        return new Promise((resolve) => {
            this.execute();
            this.child?.on('error', () => resolve(true));
            this.child?.on('close', () => resolve(true));
        });
    }

    getCloverFile() {
        return this.builder.getXdebug()?.getCloverFile();
    }

    abort() {
        this.abortController.abort();

        const killed = this.child?.killed;
        if (killed) {
            this.emitter.emit('abort');
        }

        return killed;
    }

    private execute() {
        this.output = '';
        this.incompleteLineBuffer = '';

        this.emitter.emit('start', this.builder);
        const { runtime, args, options } = this.builder.build();
        this.child = spawn(runtime, args, { ...options, signal: this.abortController.signal });
        this.child.stdout!.on('data', (data) => this.processOutput(data));
        this.child.stderr!.on('data', (data) => this.processOutput(data));
        this.child.stdout!.on('end', () => this.flushCompleteLines(this.incompleteLineBuffer));
        this.child.on('error', (err: Error) => this.emitter.emit('error', err));
        this.child.on('close', (code) => this.emitter.emit('close', code, this.output));
    }

    private processOutput(data: string) {
        const out = data.toString();
        this.output += out;
        this.incompleteLineBuffer += out;
        const lines = this.flushCompleteLines(this.incompleteLineBuffer, 1);
        this.incompleteLineBuffer = lines.shift()!;
    };

    private flushCompleteLines(buffer: string, limit = 0) {
        const lines = buffer.split(/\r\n|\n/);
        while (lines.length > limit) {
            this.emitter.emit('line', lines.shift()!);
        }

        return lines;
    }
}

export class TestRunner {
    private readonly defaultObserver: TestRunnerEventProxy;
    private readonly problemMatcher = new ProblemMatcher();
    private readonly teamcityPattern = new RegExp('##teamcity\\[', 'i');
    private observers: TestRunnerObserver[] = [];

    constructor() {
        this.defaultObserver = new TestRunnerEventProxy();
        this.observe(this.defaultObserver);
    }

    observe(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on<K extends keyof EventResultMap>(eventName: K, callback: (result: EventResultMap[K]) => void): this {
        this.defaultObserver.on(eventName, callback);

        return this;
    }

    run(builder: ProcessBuilder) {
        const process = new TestRunnerProcess(builder);

        process.on('start', (builder: ProcessBuilder) => this.emit(TestRunnerEvent.run, builder));
        process.on('line', (line: string) => this.processLine(line, builder));
        process.on('error', (err: Error) => this.handleProcessError(err));
        process.on('close', (code: number | null, output: string) => this.handleProcessClose(code, output));

        return process;
    }

    emit<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]) {
        for (const observer of this.observers) {
            const handler = observer[eventName] as ((result: EventResultMap[K]) => void) | undefined;
            handler?.call(observer, result);
        }
    }

    private handleProcessError(err: Error) {
        const error = err.stack ?? err.message;
        this.emit(TestRunnerEvent.error, error);
        this.emit(TestRunnerEvent.close, 2);
    }

    private handleProcessClose(code: number | null, output: string) {
        const eventName = this.teamcityPattern.test(output) ? TestRunnerEvent.output : TestRunnerEvent.error;
        this.emit(eventName, output);
        this.emit(TestRunnerEvent.close, code);
    }

    private processLine(line: string, builder: ProcessBuilder) {
        this.emitTestResult(builder, this.problemMatcher.parse(line));
        this.emit(TestRunnerEvent.line, line);
    }

    private emitTestResult(builder: ProcessBuilder, result: TestResult | undefined) {
        if (!result) {
            return;
        }

        result = builder.replacePath(result);
        if ('event' in result!) {
            this.emit(result.event, result);
        }
        this.emit(TestRunnerEvent.result, result!);
    }
}
