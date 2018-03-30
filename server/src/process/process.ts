import { Command } from 'vscode-languageserver';

import { ChildProcess, SpawnOptions, spawn } from 'child_process';

export class Process {
    private output: string = '';
    constructor(private command: Command, private options?: SpawnOptions) {}

    run(callback: Function = () => {}): Promise<string> {
        return new Promise(resolve => {
            const process: ChildProcess = spawn(this.command.command, this.command.arguments as string[], this.options);
            const output: Buffer[] = [];

            process.stdout.on('data', (buffer: Buffer) => {
                callback('stdout', buffer);
                output.push(buffer);
            });

            process.stderr.on('data', (buffer: Buffer) => {
                callback('stderr', buffer);
                output.push(buffer);
            });

            process.on('exit', () => {
                this.output = output
                    .map(buffer => buffer.toString())
                    .join('')
                    .replace(/\r?\n$/, '');
                resolve(this.output);
            });
        });
    }

    getOutput(): string {
        return this.output;
    }
}
