import { SpawnOptionsWithoutStdio } from 'child_process';
import { problemMatcher, Result, TestEvent, TestResult } from './problem-matcher';
import { Command } from './command';

export enum TestRunnerEvent {
    result = 'result',
    line = 'line',
    close = 'close',
}

export type TestRunnerObserver = {
    [TestRunnerEvent.result]?: (result: Result) => void;
    [TestRunnerEvent.line]?: (line: string) => void;
    [TestRunnerEvent.close]?: (code: number | null) => void;
} & { [p in TestEvent]?: (result: TestResult) => void };

class DefaultObserver implements TestRunnerObserver {
    private listeners = [...Object.values(TestRunnerEvent), ...Object.values(TestEvent)].reduce(
        (listeners, key) => {
            listeners[key] = [];
            return listeners;
        },
        {} as { [p: string]: Array<Function> }
    );

    close(code: number | null): void {
        this.trigger(TestRunnerEvent.close, code);
    }

    line(line: string): void {
        this.trigger(TestRunnerEvent.line, line);
    }

    result(result: Result): void {
        this.trigger(TestRunnerEvent.result, result);
    }

    testSuiteStarted(result: Result): void {
        this.trigger(TestEvent.testSuiteStarted, result);
    }

    testSuiteFinished(result: Result): void {
        this.trigger(TestEvent.testSuiteFinished, result);
    }

    testStarted(result: Result): void {
        this.trigger(TestEvent.testStarted, result);
    }

    testFinished(result: Result): void {
        this.trigger(TestEvent.testFinished, result);
    }

    testFailed(result: Result): void {
        this.trigger(TestEvent.testFailed, result);
    }

    testIgnored(result: Result): void {
        this.trigger(TestEvent.testIgnored, result);
    }

    testCount(result: Result): void {
        this.trigger(TestEvent.testCount, result);
    }

    on(event: TestRunnerEvent | TestEvent, fn: Function) {
        this.listeners[event].push(fn);

        return this;
    }

    private trigger(eventName: string, result: Result | string | number | null) {
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
        this.registerObserver(this.defaultObserver);
    }

    registerObserver(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on(eventName: TestRunnerEvent | TestEvent, fn: Function) {
        this.defaultObserver.on(eventName, fn);

        return this;
    }

    run(command: Command, options?: SpawnOptionsWithoutStdio) {
        return new Promise((resolve, reject) => {
            const proc = command.run({ ...this.options, ...options });

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
                this.isPhpUnit(output) ? resolve(output) : reject(output);
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
            if ('event' in result) {
                this.trigger(result.event, mappingResult);
            }

            this.trigger(TestRunnerEvent.result, mappingResult);
        }
    }

    private trigger(
        eventName: TestEvent | TestRunnerEvent,
        result: Result | string | number | null
    ) {
        this.observers
            .filter((observer) => observer[eventName])
            .forEach((observer) => (observer[eventName] as Function)(result));
    }
}
