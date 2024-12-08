import { spawn } from 'child_process';
import { ChildProcess, SpawnOptions } from 'node:child_process';
import { CommandBuilder } from './CommandBuilder';
import { ProblemMatcher, TestResult, TestResultEvent } from './ProblemMatcher';
import { DefaultObserver, EventResultMap, TestRunnerEvent, TestRunnerObserver } from './TestRunnerObserver';

export class TestRunnerProcess {
    constructor(private process: ChildProcess) {}

    kill() {
        if (!this.process.killed) {
            this.process.stdin?.end();
            this.process.kill();
        }

        return this.process.killed;
    }

    wait() {
        return new Promise((resolve) => {
            this.process.on('error', () => resolve(true));
            this.process.on('close', () => resolve(true));
        });
    }

    static create(command: string, args: readonly string[], options: SpawnOptions) {
        return spawn(command, args, options);
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
        let temp = '';
        let output = '';
        const processOutput = (data: string) => {
            const out = data.toString();
            output += out;
            temp += out;
            const lines = temp.split(/\r\n|\n/);
            while (lines.length > 1) {
                this.processLine(lines.shift()!, builder);
            }
            temp = lines.shift()!;
        };

        const { command, args, options } = builder.build();
        this.emit(TestRunnerEvent.run, [command, ...args].join(' '));

        const proc = TestRunnerProcess.create(command, args, options);
        proc.stdout!.on('data', processOutput);
        proc.stderr!.on('data', processOutput);
        proc.stdout!.on('end', () => this.processLine(temp, builder));

        proc.on('error', (err: Error) => {
            const error = err.stack ?? err.message;
            this.emit(TestRunnerEvent.error, error);
            this.emit(TestRunnerEvent.close, 2);
        });

        proc.on('close', (code) => {
            const eventName = this.isTestRunning(output) ? TestRunnerEvent.output : TestRunnerEvent.error;
            this.emit(eventName, output);
            this.emit(TestRunnerEvent.close, code);
        });

        return new TestRunnerProcess(proc);
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
