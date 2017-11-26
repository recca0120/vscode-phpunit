import { ChildProcess, SpawnOptions, spawn } from 'child_process';

import { EventEmitter } from 'events';
import { tap } from '../helpers';

export class Process {
    constructor(private eventEmitter: EventEmitter = new EventEmitter()) {}

    spawn(parameters: string[], options?: SpawnOptions): Promise<string> {
        return new Promise(resolve => {
            const command: string = parameters.shift() || '';
            const output: Buffer[] = [];

            return tap(spawn(command, parameters, options), (process: ChildProcess) => {
                process.stdout.on('data', (buffer: Buffer) => {
                    output.push(buffer);
                    this.eventEmitter.emit('stdout', buffer);
                });

                process.stderr.on('data', (buffer: Buffer) => {
                    this.eventEmitter.emit('stderr', buffer);
                });

                process.on('exit', code => {
                    this.eventEmitter.emit('exit', code);
                    resolve(output.map(buffer => buffer.toString()).join(''));
                });
            });
        });
    }

    on(name: string | symbol, callback: Function): Process {
        this.eventEmitter.on(name, callback);

        return this;
    }
}

export class ProcessFactory {
    public create(): Process {
        return new Process();
    }
}
