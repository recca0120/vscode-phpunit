import { Parser, TestCase } from './parser';

import { Command } from './command';
import { EventEmitter } from 'events';
import { ProcessFactory } from './process';

export enum State {
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

export class PHPUnit extends EventEmitter {
    constructor(private parser = new Parser(), private processFactory = new ProcessFactory()) {
        super();
    }

    handle(command: Command): Promise<TestCase[]> {
        return new Promise((resolve, reject) => {
            const args = command.toArray();
            const xml = command.getXML();

            this.emit('stdout', `${args.join(' ')}\n\n`);

            this.processFactory
                .create()
                .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
                .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer))
                .on('exit', () => {
                    this.emit('stdout', '\n\n');
                    this.parser
                        .parseXML(xml)
                        .then(testCases => {
                            resolve(testCases);
                            command.clear();
                        })
                        .catch(error => {
                            command.clear();
                            reject(error);
                        });
                })
                .spawn(args, { cwd: command.rootPath });
        });
    }
}
