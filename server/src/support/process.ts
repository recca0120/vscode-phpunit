import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { Command } from 'vscode-languageserver-types';

export class Process {
    spawn(command: Command, options?: SpawnOptions): Promise<string> {
        return new Promise(resolve => {
            const process: ChildProcess = spawn(command.command, command.arguments as string[], options);
            const buffers: Buffer[] = [];

            process.stdout.on('data', (buffer: Buffer) => {
                buffers.push(buffer);
            });

            process.on('exit', () => {
                resolve(this.asString(buffers));
            });
        });
    }

    private asString(buffers: Buffer[]) {
        return buffers
            .join('')
            .toString()
            .trim();
    }
}
