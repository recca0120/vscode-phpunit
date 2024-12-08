import { spawn } from 'child_process';
import { ChildProcess } from 'node:child_process';
import { CommandBuilder } from './Command';
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

        const { cmd, args, options } = builder.build();
        this.trigger(TestRunnerEvent.run, [cmd, ...args].join(' '));

        const proc = spawn(cmd, args, options);
        proc.stdout!.on('data', processOutput);
        proc.stderr!.on('data', processOutput);
        proc.stdout!.on('end', () => this.processLine(temp, builder));

        proc.on('error', (err: Error) => {
            const error = err.stack ?? err.message;
            this.trigger(TestRunnerEvent.error, error);
            this.trigger(TestRunnerEvent.close, 2);
        });

        proc.on('close', (code) => {
            const eventName = this.isTestRunning(output) ? TestRunnerEvent.output : TestRunnerEvent.error;
            this.trigger(eventName, output);
            this.trigger(TestRunnerEvent.close, code);
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
                this.trigger(result.event, result);
            }

            this.trigger(TestRunnerEvent.result, result!);
        }

        this.trigger(TestRunnerEvent.line, line);
    }

    private trigger(
        eventName: TestRunnerEvent | TestResultEvent,
        result: TestResult | string | number | null,
    ) {
        this.observers
            .filter((observer) => observer[eventName])
            .forEach((observer) => (observer[eventName] as Function)(result));
    }
}
