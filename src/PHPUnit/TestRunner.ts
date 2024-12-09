import { spawn } from 'child_process';
import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { CommandBuilder } from './CommandBuilder';
import { ProblemMatcher, TestResult, TestResultEvent } from './ProblemMatcher';
import { DefaultObserver, EventResultMap, TestRunnerEvent, TestRunnerObserver } from './TestRunnerObserver';

export class TestRunnerProcess {
    private child?: ChildProcess;
    private emitter = new EventEmitter();
    private output = '';
    private temp = '';
    private abortController: AbortController;

    constructor(private builder: CommandBuilder) {
        this.abortController = new AbortController();
    }

    on(eventName: string, callback: (...args: any[]) => void) {
        this.emitter.on(eventName, callback);

        return this;
    }

    abort() {
        this.abortController.abort();

        return this.child?.killed;
    }

    run() {
        return new Promise((resolve) => {
            this.execute();
            this.child?.on('error', () => resolve(true));
            this.child?.on('close', () => resolve(true));
        });
    }

    getOutput() {
        return this.output;
    }

    private execute() {
        this.output = '';
        this.temp = '';

        const { command, args, options } = this.builder.build();
        this.emitter.emit('start', command, args);

        this.child = spawn(command, args, { ...options, signal: this.abortController.signal });
        this.child.stdout!.on('data', (data) => this.appendOutput(data));
        this.child.stderr!.on('data', (data) => this.appendOutput(data));
        this.child.stdout!.on('end', () => this.emitLines(this.temp));
        this.child.on('error', (err: Error) => this.emitter.emit('error', err));
        this.child.on('close', (code) => this.emitter.emit('close', code, this.output));
    }

    private appendOutput(data: string) {
        const out = data.toString();
        this.output += out;
        this.temp += out;
        const lines = this.emitLines(this.temp, 1);
        this.temp = lines.shift()!;
    };

    private emitLines(temp: string, limit = 0) {
        const lines = temp.split(/\r\n|\n/);
        while (lines.length > limit) {
            this.emitter.emit('line', lines.shift()!);
        }

        return lines;
    }
}

export class TestRunner {
    private readonly defaultObserver: DefaultObserver;
    private readonly problemMatcher = new ProblemMatcher();
    private readonly teamcityPattern = new RegExp('##teamcity\\[', 'i');
    private observers: TestRunnerObserver[] = [];

    constructor() {
        this.defaultObserver = new DefaultObserver();
        this.observe(this.defaultObserver);
    }

    observe(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on<K extends keyof EventResultMap>(eventName: K, callback: (result: EventResultMap[K]) => void): this {
        this.defaultObserver.on(eventName, callback);

        return this;
    }

    run(builder: CommandBuilder) {
        const process = new TestRunnerProcess(builder);
        process.on('start', (command: string, args: string[]) => this.emit(TestRunnerEvent.run, [command, ...args].join(' ')));
        process.on('line', (line: string) => this.processLine(line, builder));
        process.on('error', (err: Error) => {
            const error = err.stack ?? err.message;
            this.emit(TestRunnerEvent.error, error);
            this.emit(TestRunnerEvent.close, 2);
        });
        process.on('close', (code: number | null, output: string) => {
            const eventName = this.isTestRunning(output) ? TestRunnerEvent.output : TestRunnerEvent.error;
            this.emit(eventName, output);
            this.emit(TestRunnerEvent.close, code);
        });

        return process;
    }

    private isTestRunning(output: string) {
        return this.teamcityPattern.test(output);
    }

    private processLine(line: string, builder: CommandBuilder) {
        let result = this.problemMatcher.parse(line);
        if (result) {
            result = builder.replacePath(result);
            if ('event' in result!) {
                this.emit(result.event, result);
            }

            this.emit(TestRunnerEvent.result, result!);
        }
        this.emit(TestRunnerEvent.line, line);
    }

    private emit(eventName: TestRunnerEvent | TestResultEvent, result: TestResult | string | number | null) {
        this.observers
            .filter((observer) => observer[eventName])
            .forEach((observer) => (observer[eventName] as Function)(result));
    }
}
