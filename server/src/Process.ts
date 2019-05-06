import { Command } from 'vscode-languageserver-protocol';
import { spawn, SpawnOptions, ChildProcess } from 'child_process';

export class Process {
    private process: ChildProcess;
    private reject: Function;

    public run(command: Command, options?: SpawnOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            this.reject = reject;

            const buffers: any[] = [];

            this.process = spawn(command.command, command.arguments, options);

            this.process.stdout.on('data', data => {
                buffers.push(data);
            });

            this.process.stderr.on('data', data => {
                buffers.push(data);
            });

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
