import { Arguments } from './arguments';
import { EventEmitter } from 'events';
import { Filesystem } from '../filesystem';
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

    handle(path: string, args: string[], options: Options = {}): Promise<TestCase[]> {
        const basePath: string = options.basePath || __dirname;
        const execPath: string = options.execPath || '';

        const parameters = new Arguments(args);

        return new Promise((resolve, reject) => {
            if (parameters.has('--teamcity') === false) {
                parameters.put('--log-junit', this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`));
            }

            if (parameters.has('-c') === false) {
                parameters.put('-c', this.getConfiguration(basePath) || false);
            }

            const spawnOptions = [this.getExecutable(execPath, basePath)].concat(parameters.toArray()).concat([path]);

            this.emit('start', `${spawnOptions.join(' ')}\n\n`);
            this.processFactory
                .create()
                .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
                .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer))
                .spawn(spawnOptions, {
                    cwd: basePath,
                })
                .then(output => {
                    this.emit('exit', output);
                    const parser = this.parserFactory.create(parameters.has('--teamcity') ? 'teamcity' : 'junit');
                    const content = parameters.has('--teamcity') ? output : parameters.get('--log-junit');
                    parser
                        .parse(content)
                        .then(items => {
                            if (parameters.has('--log-junit')) {
                                this.files.unlink(parameters.get('--log-junit'));
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
            ].filter(path => path !== ''),
            basePath
        );

        if (!path) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return path;
    }

    private findFile(files: string[], basePath?: string): string {
        let searchPaths = [];
        if (basePath) {
            searchPaths = searchPaths.concat(files.map(path => `${basePath}/${path}`));
        }

        return this.files.find(searchPaths.concat(files));
    }
}
