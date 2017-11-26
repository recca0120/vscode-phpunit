import { CachableFilesystem, FilesystemInterface } from '../filesystem';

import { Arguments } from './arguments';
import { EventEmitter } from 'events';
import { ParserFactory } from '../parsers/parser-factory';
import { ProcessFactory } from './process';
import { TestCase } from '../parsers/parser';

export enum State {
    PHPUNIT_GIT_FILE = 'phpunit_git_file',
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

export class PHPUnit {
    constructor(
        private parserFactory = new ParserFactory(),
        private processFactory: ProcessFactory = new ProcessFactory(),
        private files: FilesystemInterface = new CachableFilesystem(),
        private eventEmitter: EventEmitter = new EventEmitter()
    ) {}

    handle(
        path: string,
        thisArgs: string[],
        options: any = {
            basePath: __dirname,
            execPath: '',
        }
    ): Promise<TestCase[]> {
        const basePath: string = options.basePath;
        const execPath: string = options.execPath || '';
        const cwd: string = this.files.isFile(path) ? this.files.dirname(path) : path;
        const args = new Arguments(thisArgs);

        return new Promise((resolve, reject) => {
            if (args.has('--teamcity') === false) {
                args.put('--log-junit', this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`));
            }

            if (args.has('-c') === false) {
                args.put('-c', this.getConfiguration(cwd, basePath) || false);
            }

            const spawnOptions = [this.getExecutable(execPath, cwd, basePath)].concat(args.toArray()).concat([path]);

            this.eventEmitter.emit('start', `${spawnOptions.join(' ')}\n\n`);

            this.processFactory
                .create()
                .on('stdout', (buffer: Buffer) => this.eventEmitter.emit('stdout', buffer))
                .on('stderr', (buffer: Buffer) => this.eventEmitter.emit('stderr', buffer))
                .spawn(spawnOptions, {
                    cwd: basePath,
                })
                .then(output => {
                    this.eventEmitter.emit('exit', output);
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

    on(name: string | symbol, callback: Function): PHPUnit {
        this.eventEmitter.on(name, callback);

        return this;
    }

    private getConfiguration(cwd: string, basePath: string): string {
        return this.files.findUp(['phpunit.xml', 'phpunit.xml.dist'], cwd, basePath);
    }

    private getExecutable(execPath: string, cwd: string, basePath: string): string {
        const path: string = this.files.findUp(
            [execPath, `vendor/bin/phpunit`, `phpunit.phar`, 'phpunit'].filter(path => path !== ''),
            cwd,
            basePath
        );

        if (!path) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return path;
    }
}
