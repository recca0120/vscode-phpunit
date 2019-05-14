import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { Command } from 'vscode-languageserver-protocol';

export class Process {
    private process: ChildProcess | null = null;
    private reject: Function | null = null;

    run(command: Command, options?: SpawnOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            this.reject = reject;

            const buffers: any[] = [];
            command.arguments = command.arguments || [];

            this.process = spawn(
                command.command,
                command.arguments,
                options || {}
            );

            if (!this.process) {
                return;
            }

            if (this.process.stdout) {
                this.process.stdout.on('data', data => {
                    buffers.push(data);
                });
            }

            if (this.process.stderr) {
                this.process.stderr.on('data', data => {
                    buffers.push(data);
                });
            }

            this.process.on('close', () => {
                resolve(
                    buffers.reduce((response, buffer) => {
                        return (response += buffer.toString());
                    }, '')
                );
            });
        });
    }

    kill(): boolean {
        if (!this.process) {
            return false;
        }

        this.process.kill();

        if (this.process.killed === true && this.reject) {
            this.reject('killed');

            return true;
        }

        return false;
    }
}
