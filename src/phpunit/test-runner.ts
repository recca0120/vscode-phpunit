import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import {
    problemMatcher,
    Result,
    TestConfiguration,
    TestCount,
    TestExtraResultEvent,
    TestResult,
    TestResultEvent,
    TestResultKind,
    TestResultSummary,
    TestRuntime,
    TestVersion,
    TimeAndMemory,
} from './problem-matcher';
import { Command } from './command';

export enum TestRunnerEvent {
    input = 'input',
    line = 'line',
    result = 'result',
    output = 'output',
    error = 'error',
    close = 'close',
}

export type TestRunnerObserver = {
    [TestRunnerEvent.input]?: (input: string) => void;
    [TestRunnerEvent.line]?: (line: string) => void;
    [TestRunnerEvent.result]?: (result: Result) => void;
    [TestRunnerEvent.output]?: (output: string) => void;
    [TestRunnerEvent.error]?: (error: string) => void;
    [TestRunnerEvent.close]?: (code: number | null) => void;
    [TestExtraResultEvent.testVersion]?: (result: TestVersion) => void;
    [TestExtraResultEvent.testRuntime]?: (result: TestRuntime) => void;
    [TestExtraResultEvent.testConfiguration]?: (result: TestConfiguration) => void;
    [TestExtraResultEvent.testCount]?: (result: TestCount) => void;
    [TestExtraResultEvent.testResultSummary]?: (result: TestResultSummary) => void;
    [TestExtraResultEvent.timeAndMemory]?: (result: TimeAndMemory) => void;
} & { [p in TestResultEvent]?: (result: TestResult) => void };

class DefaultObserver implements TestRunnerObserver {
    private listeners = [
        ...Object.values(TestRunnerEvent),
        ...Object.values(TestResultEvent),
        ...Object.values(TestExtraResultEvent),
    ].reduce((listeners, key) => {
        listeners[key] = [];
        return listeners;
    }, {} as { [p: string]: Array<Function> });

    input(input: string): void {
        this.trigger(TestRunnerEvent.input, input);
    }

    output(output: string): void {
        this.trigger(TestRunnerEvent.output, output);
    }

    error(error: string): void {
        this.trigger(TestRunnerEvent.error, error);
    }

    close(code: number | null): void {
        this.trigger(TestRunnerEvent.close, code);
    }

    line(line: string): void {
        this.trigger(TestRunnerEvent.line, line);
    }

    result(result: Result): void {
        this.trigger(TestRunnerEvent.result, result);
    }

    testVersion(result: TestVersion): void {
        this.trigger(TestExtraResultEvent.testVersion, result);
    }

    testRuntime(result: TestRuntime): void {
        this.trigger(TestExtraResultEvent.testRuntime, result);
    }

    testConfiguration(result: TestConfiguration): void {
        this.trigger(TestExtraResultEvent.testConfiguration, result);
    }

    testSuiteStarted(result: Result): void {
        this.trigger(TestResultEvent.testSuiteStarted, result);
    }

    testSuiteFinished(result: Result): void {
        this.trigger(TestResultEvent.testSuiteFinished, result);
    }

    testStarted(result: Result): void {
        this.trigger(TestResultEvent.testStarted, result);
    }

    testFinished(result: Result): void {
        this.trigger(TestResultEvent.testFinished, result);
    }

    testFailed(result: Result): void {
        this.trigger(TestResultEvent.testFailed, result);
    }

    testIgnored(result: Result): void {
        this.trigger(TestResultEvent.testIgnored, result);
    }

    testCount(result: Result): void {
        this.trigger(TestExtraResultEvent.testCount, result);
    }

    timeAndMemory(result: TimeAndMemory): void {
        this.trigger(TestExtraResultEvent.timeAndMemory, result);
    }

    testResultSummary(result: TestResultSummary): void {
        this.trigger(TestExtraResultEvent.testResultSummary, result);
    }

    on(eventName: TestRunnerEvent | TestResultKind, fn: Function) {
        this.listeners[eventName].push(fn);

        return this;
    }

    private trigger(
        eventName: TestRunnerEvent | TestResultKind,
        result: Result | string | number | null
    ) {
        this.listeners[eventName].forEach((fn) => fn(result));
    }
}

export class TestRunner {
    private readonly defaultObserver: DefaultObserver;
    private observers: TestRunnerObserver[] = [];

    private pattern = new RegExp(
        'PHPUnit\\s[\\d\\.]+\\sby\\sSebastian\\sBergmann\\sand\\scontributors'
    );

    constructor(private options?: SpawnOptionsWithoutStdio) {
        this.defaultObserver = new DefaultObserver();
        this.observe(this.defaultObserver);
    }

    observe(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on(eventName: TestRunnerEvent | TestResultKind, fn: Function) {
        this.defaultObserver.on(eventName, fn);

        return this;
    }

    run(command: Command, options?: SpawnOptionsWithoutStdio) {
        return new Promise((resolve, reject) => {
            options = { ...this.options, ...options } ?? {};
            const input = command.apply(options);

            this.trigger(TestRunnerEvent.input, input.join(' '));

            const [firstArgs, ...args] = input;
            const proc = spawn(firstArgs!, args, options);

            let temp = '';
            let output = '';
            const processOutput = (data: string) => {
                const out = data.toString();
                output += out;
                temp += out;
                const lines = temp.split(/\r\n|\n/);
                while (lines.length > 1) {
                    this.processLine(lines.shift()!, command);
                }
                temp = lines.shift()!;
            };

            proc.stdout!.on('data', processOutput);
            proc.stderr!.on('data', processOutput);
            proc.stdout!.on('end', () => this.processLine(temp, command));
            proc.stderr!.on('end', () => this.processLine(temp, command));

            proc.on('close', (code) => {
                this.trigger(TestRunnerEvent.close, code);
                if (this.isPhpUnit(output)) {
                    this.trigger(TestRunnerEvent.output, output);
                    resolve(output);
                } else {
                    this.trigger(TestRunnerEvent.error, output);
                    reject(output);
                }
            });
        });
    }

    private isPhpUnit(output: string) {
        return this.pattern.test(output);
    }

    private processLine(line: string, command: Command) {
        this.trigger(TestRunnerEvent.line, line);
        const result = problemMatcher.parse(line);

        if (result) {
            const mappingResult = command.mapping(result);
            if ('kind' in result) {
                this.trigger(result.kind, mappingResult);
            }

            this.trigger(TestRunnerEvent.result, mappingResult);
        }
    }

    private trigger(
        eventName: TestRunnerEvent | TestResultKind,
        result: Result | string | number | null
    ) {
        this.observers
            .filter((observer) => observer[eventName])
            .forEach((observer) => (observer[eventName] as Function)(result));
    }
}
