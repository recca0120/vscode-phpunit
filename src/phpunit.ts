import { ParserFactory, TestCase } from './parser';

import { CommandArguments } from './command-arguments';
import { EventEmitter } from 'events';
import { Filesystem } from './filesystem';
import { ProcessFactory } from './process';

export enum State {
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

interface Options {
    basePath?: string;
    execPath?: string;
}

export class PHPUnit extends EventEmitter {
    constructor(
        private parserFactory = new ParserFactory(),
        private processFactory: ProcessFactory = new ProcessFactory(),
        private files: Filesystem = new Filesystem()
    ) {
        super();
    }

    handle(path: string, args: CommandArguments, options: Options = {}): Promise<TestCase[]> {
        const basePath: string = options.basePath || __dirname;
        const execPath: string = options.execPath || '';

        return new Promise((resolve, reject) => {
            if (args.has('--teamcity') === false) {
                args.put('--log-junit', this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`));
            }

            if (args.has('-c') === false) {
                args.put('-c', this.getConfiguration(basePath));
            }

            const spawnOptions = [this.getExecutable(execPath, basePath)].concat(args.toArray()).concat([path]);

            this.emit('before');
            this.emit('stdout', `${spawnOptions.join(' ')}\n\n`);
            this.processFactory
                .create()
                .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
                .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer))
                .spawn(spawnOptions, {
                    cwd: basePath,
                })
                .then(output => {
                    this.emit('stdout', '\n\n');
                    const parser = this.parserFactory.create(args.has('--teamcity') ? 'teamcity' : 'junit');
                    const content = args.has('--teamcity') ? output : args.get('--log-junit');
                    parser
                        .parse(content)
                        .then(items => {
                            if (args.has('--log-junit')) {
                                this.files.unlink(args.get('--log-junit'));
                            }
                            resolve(items);
                        })
                        .catch(error => reject(error));
                });
        });
    }

    private getConfiguration(basePath: string): string {
        return this.findFile(
            ['phpunit.xml', 'phpunit.xml.dist', 'laravel/phpunit.xml', 'laravel/phpunit.xml.dist'],
            basePath
        );
    }

    private getExecutable(execPath: string, basePath: string): string {
        const path: string = this.findFile(
            [
                execPath,
                `vendor/bin/phpunit`,
                `laravel/vendor/bin/phpunit`,
                `phpunit.phar`,
                'laravel/phpunit.phar',
                'phpunit',
            ].filter(path => !!path),
            basePath
        );

        if (!path) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return path;
    }

    private findFile(files: string[], basePath?: string): string {
        let findFiles = [];
        if (basePath) {
            findFiles = findFiles.concat(files.map(path => `${basePath}/${path}`));
        }

        return findFiles
            .concat(files)
            .map(path => this.files.find(path))
            .find(path => path !== '');
    }
}
