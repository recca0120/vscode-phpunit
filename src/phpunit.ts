import { ParserFactory, TestCase } from './parser';

import { CommandOptions } from './command-options';
import { EventEmitter } from 'events';
import { Filesystem } from './filesystem';
import { ProcessFactory } from './process';
import { container } from './container';
import { tap } from './helpers';

export enum State {
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

export class PHPUnit extends EventEmitter {
    constructor(
        private parserFactory = new ParserFactory(),
        private processFactory: ProcessFactory = container.processFactory,
        private basePath: string = container.basePath,
        private files: Filesystem = container.files
    ) {
        super();
    }

    handle(path: string, options: CommandOptions, execPath: string = ''): Promise<TestCase[]> {
        return new Promise((resolve, reject) => {
            if (options.has('--teamcity') === false) {
                options.put('--log-junit', this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`));
            }

            if (options.has('-c') === false) {
                options.put('-c', this.getConfiguration());
            }

            const spawnOptions = [this.getExecutable(execPath)].concat(options.toArray()).concat([path]);

            this.emit('stdout', `${spawnOptions.join(' ')}\n\n`);
            this.processFactory
                .create()
                .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
                .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer))
                .spawn(spawnOptions, {
                    cwd: this.basePath,
                })
                .then(output => {
                    this.emit('stdout', '\n\n');
                    const parser = this.parserFactory.create(options.has('--teamcity') ? 'teamcity' : 'junit');
                    const content = options.has('--teamcity') ? output : options.get('--log-junit');
                    parser
                        .parse(content)
                        .then(items => resolve(items))
                        .catch(error => reject(error));
                });
        });
    }

    private getConfiguration(): string {
        return ['phpunit.xml', 'phpunit.xml.dist']
            .map(file => `${this.basePath}/${file}`)
            .find(file => this.files.exists(file));
    }

    private getExecutable(execPath: string = ''): string {
        return tap(execPath !== '' && execPath !== 'phpunit' ? execPath : this.findExecutable(), execPath => {
            if (!execPath) {
                throw State.PHPUNIT_NOT_FOUND;
            }
        });
    }

    private findExecutable(): string {
        return [`${this.basePath}/vendor/bin/phpunit`, `${this.basePath}/phpunit.phar`, 'phpunit']
            .map(path => this.files.find(path))
            .find(path => path !== '');
    }
}
