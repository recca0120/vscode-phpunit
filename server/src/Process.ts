import { Command } from 'vscode-languageserver-types';
import { spawn, SpawnOptions } from 'child_process';

export class Process {
    public run(command: Command, options?: SpawnOptions): Promise<string> {
        return new Promise(resolve => {
            const process = spawn(command.command, command.arguments, options);
            const buffers = [];
            process.stdout.on('data', data => {
                buffers.push(data);
            });
            process.stderr.on('data', data => {
                buffers.push(data);
            });
            process.on('close', code => {
                resolve(
                    buffers.reduce((response, buffer) => {
                        return (response += buffer.toString());
                    }, '')
                );
            });
        });
    }
}
