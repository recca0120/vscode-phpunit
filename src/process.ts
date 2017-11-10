import { ChildProcess, SpawnOptions, spawn } from 'child_process';

import { EventEmitter } from 'events';
import { tap } from './helpers';

export class Process extends EventEmitter {
    spawn(parameters: string[], options?: SpawnOptions): ChildProcess {
        const command: string = parameters.shift();

        return tap(spawn(command, parameters, options), (process: ChildProcess) => {
            process.stdout.on('data', (buffer: Buffer) => {
                this.emit('stdout', buffer);
            });

            process.stderr.on('data', (buffer: Buffer) => {
                this.emit('stderr', buffer);
            });

            process.on('exit', code => {
                this.emit('exit', code);
            });
        });
    }
}

export class ProcessFactory {
    public create() {
        return new Process();
    }
}
