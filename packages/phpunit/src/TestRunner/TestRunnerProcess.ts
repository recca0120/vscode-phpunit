import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';
import { CloverParser, type FileCoverageData } from '../TestCoverage';
import { TestOutputParser, type TestResult } from '../TestOutput';
import type { ProcessCommand } from './ProcessCommand';
import { TestRunnerEvent } from './TestRunnerEvent';
import type { TestRunnerEmitter } from './TestRunnerObserver';
import { toLocalResult } from './toLocalResult';

const TEAMCITY_PATTERN = /##teamcity\[/i;

export class TestRunnerProcess {
    private child?: ChildProcess;
    private emitter = new EventEmitter();
    private output = '';
    private stdoutBuffer = '';
    private stderrBuffer = '';
    private abortController: AbortController;
    private aborted = false;
    private closed = false;

    constructor(
        private command: ProcessCommand,
        events?: TestRunnerEmitter,
        private testOutputParser = new TestOutputParser(),
    ) {
        this.abortController = new AbortController();
        if (events) {
            this.forwardTo(events);
        }
    }

    // biome-ignore lint/suspicious/noExplicitAny: EventEmitter callback signature requires any[]
    on(eventName: string, callback: (...args: any[]) => void) {
        this.emitter.on(eventName, callback);

        return this;
    }

    // biome-ignore lint/suspicious/noExplicitAny: EventEmitter emit signature requires any[]
    emit(eventName: string, ...args: any[]) {
        this.emitter.emit(eventName, ...args);
    }

    run() {
        return new Promise((resolve) => {
            this.execute();
            if (!this.child) {
                this.emitter.once('abort', () => resolve(true));
                return;
            }

            this.child.on('error', () => {
                if (!this.aborted) {
                    resolve(true);
                }
            });
            this.child.on('close', () => resolve(true));
        });
    }

    async readCoverage(): Promise<FileCoverageData[]> {
        const cloverFile = this.command.cloverFile();
        if (!cloverFile) {
            return [];
        }

        const data = await new CloverParser().parseFile(cloverFile);
        await rm(cloverFile, { force: true });

        return data.map((d) => ({
            ...d,
            filePath: this.command.paths.toLocal(d.filePath),
        }));
    }

    abort() {
        this.aborted = true;
        this.emitter.emit('abort');
        this.abortController.abort();
    }

    private execute() {
        this.output = '';
        this.stdoutBuffer = '';
        this.stderrBuffer = '';

        this.emitter.emit('start', this.command);
        const { runtime, args, options } = this.command.build();
        this.child = spawn(runtime, args, { ...options, signal: this.abortController.signal });
        const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') };
        const decode = (data: Buffer | string, decoder: StringDecoder) =>
            typeof data === 'string' ? data : decoder.write(data);
        this.child.stdout?.on('data', (data) =>
            this.processStream(decode(data, decoders.stdout), 'stdout'),
        );
        this.child.stderr?.on('data', (data) =>
            this.processStream(decode(data, decoders.stderr), 'stderr'),
        );
        this.child.stdout?.on('end', () => this.flushCompleteLines(this.stdoutBuffer));
        this.child.stderr?.on('end', () => this.flushCompleteLines(this.stderrBuffer));
        this.child.on('error', (err: Error) => this.emitter.emit('error', err));
        this.child.on('close', (code) => this.emitter.emit('close', code, this.output));
    }

    private processStream(data: string, stream: 'stdout' | 'stderr') {
        const out = data.toString();
        this.output += out;

        const buffer = (stream === 'stdout' ? this.stdoutBuffer : this.stderrBuffer) + out;
        const lines = this.flushCompleteLines(buffer, 1);
        const remaining = lines.shift() ?? '';

        if (stream === 'stdout') {
            this.stdoutBuffer = remaining;
        } else {
            this.stderrBuffer = remaining;
        }
    }

    private flushCompleteLines(buffer: string, limit = 0) {
        const lines = buffer.split(/\r\n|\n/);
        while (lines.length > limit) {
            const line = lines.shift();
            if (line !== undefined) {
                this.emitter.emit('line', line);
            }
        }

        return lines;
    }

    private forwardTo(events: TestRunnerEmitter) {
        this.on('start', () => events.emit(TestRunnerEvent.run, this.command));
        this.on('line', (line: string) => this.forwardLine(events, line));
        this.on('error', (err: Error) => this.forwardError(events, err));
        this.on('close', (code: number | null, output: string) =>
            this.forwardClose(events, code, output),
        );
    }

    private forwardLine(events: TestRunnerEmitter, line: string) {
        this.forwardResult(events, this.testOutputParser.parse(line));
        events.emit(TestRunnerEvent.line, line);
    }

    private forwardResult(events: TestRunnerEmitter, result: TestResult | undefined) {
        if (!result) {
            return;
        }

        const replaced = toLocalResult(result, this.command.paths);
        if ('event' in replaced) {
            events.emit(replaced.event, replaced);
        }
        events.emit(TestRunnerEvent.result, replaced);
    }

    private forwardError(events: TestRunnerEmitter, err: Error) {
        if (this.aborted) {
            return;
        }

        this.closed = true;
        events.emit(TestRunnerEvent.error, err.stack ?? err.message);
        events.emit(TestRunnerEvent.close, 2);
    }

    private forwardClose(events: TestRunnerEmitter, code: number | null, output: string) {
        if (this.closed) {
            return;
        }
        if (this.aborted) {
            events.emit(TestRunnerEvent.close, code);
            return;
        }
        events.emit(
            TEAMCITY_PATTERN.test(output) ? TestRunnerEvent.output : TestRunnerEvent.error,
            output,
        );
        events.emit(TestRunnerEvent.close, code);
    }
}
