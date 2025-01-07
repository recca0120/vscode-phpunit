import { spawn } from 'child_process';
import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { CommandBuilder } from './CommandBuilder';
import { ProblemMatcher, TestResult, TeamcityEvent } from './ProblemMatcher';
import { EventResultMap, TestRunnerEvent, TestRunnerEventProxy, TestRunnerObserver } from './TestRunnerObserver';

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
        this.temp = '';

        this.emitter.emit('start', this.builder);
        const { command, args, options } = this.builder.build();
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

    run(command: CommandBuilder) {
        const process = new TestRunnerProcess(command);
        process.on('start', (command: CommandBuilder) => this.emit(TestRunnerEvent.run, command));
        process.on('line', (line: string) => this.processLine(line, command));
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

    emit(eventName: TestRunnerEvent | TeamcityEvent, result: TestResult | any) {
        this.observers
            .filter((observer) => observer[eventName])
            .forEach((observer) => (observer[eventName] as Function)(result));
    }

    private isTestRunning(output: string) {
        return this.teamcityPattern.test(output);
    }

    private processLine(line: string, command: CommandBuilder) {
        let result = this.problemMatcher.parse(line);
        if (result) {
            result = command.replacePath(result);
            if ('event' in result!) {
                this.emit(result.event, result);
            }

            this.emit(TestRunnerEvent.result, result!);
        }
        this.emit(TestRunnerEvent.line, line);
    }
}
