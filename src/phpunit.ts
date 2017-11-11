import { ParserFactory, TestCase } from './parser';

import { Command } from './command';
import { EventEmitter } from 'events';
import { ProcessFactory } from './process';
import { tap } from './helpers';

export enum State {
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

class Delayed {
    private timer: any;

    resolve(promise: Promise<any>, time = 500): Promise<any> {
        this.cancel();

        return new Promise(resolve => {
            this.timer = setTimeout(() => {
                resolve(true);
            }, time);
        }).then(() => {
            return promise;
        });
    }

    cancel() {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        return this;
    }
}

const delayed = new Delayed();

export class PHPUnit extends EventEmitter {
    constructor(private parserFactory = new ParserFactory(), private processFactory = new ProcessFactory()) {
        super();
    }

    handle(command: Command): Promise<TestCase[]> {
        return delayed.resolve(this.fire(command), 50);
    }

    private fire(command: Command): Promise<TestCase[]> {
        return new Promise((resolve, reject) => {
            const args = command.args();
            const type = args.some(arg => arg === '--log-junit') ? 'junit' : 'teamcity';
            const buffers: string[] = [];

            this.emit('stdout', `${args.join(' ')}\n\n`);

            tap(this.processFactory.create(), process => {
                process
                    .on('stdout', (buffer: Buffer) => {
                        buffers.push(buffer.toString());
                        this.emit('stdout', buffer);
                    })
                    .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer))
                    .on('exit', () => {
                        this.emit('stdout', '\n\n');
                        tap(this.parserFactory.create(type), parser => {
                            parser
                                .parse(type === 'junit' ? command.getXML() : buffers.join(''))
                                .then(testCases => {
                                    resolve(testCases);
                                    command.clear();
                                })
                                .catch(error => {
                                    command.clear();
                                    reject(error);
                                });
                        });
                    })
                    .spawn(args, { cwd: command.rootPath });
            });
        });
    }
}
