import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ProcessBuilder } from './ProcessBuilder';

export class TestRunnerProcess {
    private child?: ChildProcess;
    private emitter = new EventEmitter();
    private output = '';
    private stdoutBuffer = '';
    private stderrBuffer = '';
    private abortController: AbortController;

    constructor(private builder: ProcessBuilder) {
        this.abortController = new AbortController();
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
            this.child?.on('error', () => resolve(true));
            this.child?.on('close', () => resolve(true));
        });
    }

    getCloverFile() {
        return this.builder.getXdebug()?.getCloverFile();
    }

    abort() {
        this.abortController.abort();
        this.emitter.emit('abort');
    }

    private execute() {
        this.output = '';
        this.stdoutBuffer = '';
        this.stderrBuffer = '';

        this.emitter.emit('start', this.builder);
        const { runtime, args, options } = this.builder.build();
        this.child = spawn(runtime, args, { ...options, signal: this.abortController.signal });
        this.child.stdout?.on('data', (data) => this.processStream(data, 'stdout'));
        this.child.stderr?.on('data', (data) => this.processStream(data, 'stderr'));
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
}
