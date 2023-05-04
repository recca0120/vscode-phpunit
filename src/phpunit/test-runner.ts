import { spawn } from 'child_process';
import { problemMatcher, Result, TestResultKind } from './problem-matcher';
import { Command } from './command';
import { DefaultObserver, TestRunnerEvent, TestRunnerObserver } from './test-runner-observer';

export class TestRunner {
    private readonly defaultObserver: DefaultObserver;
    private observers: TestRunnerObserver[] = [];
    private teamcityPattern = new RegExp('##teamcity\\[', 'i');

    constructor() {
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

    run(command: Command) {
        return new Promise((resolve) => {
            const { cmd, args, options } = command.apply();
            this.trigger(TestRunnerEvent.run, [cmd, ...args].join(' '));

            const proc = spawn(cmd, args, options);

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

            proc.on('error', (err: Error) => {
                const error = err.stack ?? err.message;
                this.trigger(TestRunnerEvent.error, error);
                this.trigger(TestRunnerEvent.close, 2);
                resolve({ proc });
            });

            proc.on('close', (code) => {
                const eventName = this.isTestRunning(output)
                    ? TestRunnerEvent.output
                    : TestRunnerEvent.error;

                this.trigger(eventName, output);
                this.trigger(TestRunnerEvent.close, code);
                resolve({ proc });
            });
        });
    }

    private isTestRunning(output: string) {
        return this.teamcityPattern.test(output);
    }

    private processLine(line: string, command: Command) {
        const result = problemMatcher.parse(line);

        if (result) {
            const mappingResult = command.mapping(result);
            if ('kind' in result) {
                this.trigger(result.kind, mappingResult);
            }

            this.trigger(TestRunnerEvent.result, mappingResult);
        }

        this.trigger(TestRunnerEvent.line, line);
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
