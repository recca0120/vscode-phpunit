import { ChildProcess, SpawnOptions, spawn } from 'child_process';
import { Parser, TestCase } from './parser';

import { EventEmitter } from 'events';
import { Filesystem } from './filesystem';

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

interface CommandOptions {
    rootPath: string;
}

export class Command {
    private xml: string;

    constructor(
        private fileName: string,
        private args: Array<string> = [],
        private execPath: string = '',
        public options: CommandOptions = {
            rootPath: __dirname,
        },
        private files = new Filesystem()
    ) {
        this.execPath = !this.execPath || this.execPath.trim() === 'phpunit' ? this.getExecutable() : this.execPath;
        this.xml = this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`);
    }

    getXML() {
        return this.xml;
    }

    toArray() {
        const execPath = this.execPath;

        if (!execPath) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return [
            [execPath],
            this.parseOptions(
                this.getConfiguration()
                    .concat(this.args)
                    .concat(['--log-junit', this.getXML()])
            ),
            [this.fileName],
        ].reduce((result, next) => {
            return result.concat(next);
        }, []);
    }

    clear() {
        this.files.unlink(this.getXML());
    }

    get rootPath() {
        return this.options.rootPath;
    }

    private parseOptions(args: Array<string>) {
        const options = [];
        const multiple = ['-d', '--include-path'];
        const map: Map<string, string> = new Map();

        for (let i = 0; i < args.length; i++) {
            const key = args[i];
            if (key.startsWith('-') === true) {
                const value = args[i + 1];
                const startsWith = value.startsWith('-');
                if (startsWith === false) {
                    i++;
                }

                if (value.startsWith('-') === false) {
                    if (multiple.indexOf(key) !== -1) {
                        const val = map.has(key) ? map.get(key).split('|') : [];
                        map.set(key, val.concat([value]).join('|'));
                    } else {
                        map.set(key, value);
                    }
                } else {
                    map.set(key, null);
                }
            } else {
                options.push(key);
            }
        }

        return [...map.entries()].sort().reduce((opts: Array<string>, item: Array<string>) => {
            const [key, value] = item;
            if (multiple.indexOf(key) !== -1) {
                return value.split('|').reduce((result, value) => {
                    return result.concat([key, value]);
                }, opts);
            }

            return opts.concat(item.filter(v => v !== null));
        }, options);
    }

    private getConfiguration(): Array<string> {
        const configurationFile = ['phpunit.xml', 'phpunit.xml.dist']
            .map(configurationFile => `${this.options.rootPath}/${configurationFile}`)
            .find(configurationFile => this.files.exists(configurationFile));

        return configurationFile ? ['--configuration', configurationFile] : [];
    }

    private getExecutable(): string {
        return [`${this.options.rootPath}/vendor/bin/phpunit`, `${this.options.rootPath}/phpunit.phar`, 'phpunit']
            .map(path => this.files.find(path))
            .find(command => command !== '');
    }
}

export class ProcessFactory {
    public create() {
        return new Process();
    }
}

export class Process extends EventEmitter {
    spawn(parameters: string[], options?: SpawnOptions): ChildProcess {
        const command: string = parameters.shift();
        const process = spawn(command, parameters, options);
        process.stdout.on('data', (buffer: Buffer) => {
            this.emit('stdout', buffer);
        });

        process.stderr.on('data', (buffer: Buffer) => {
            this.emit('stderr', buffer);
        });

        process.on('exit', code => {
            this.emit('exit', code);
        });

        return process;
    }
}

export class Validator {
    testCaseClass: string[] = [
        'PHPUnit\\\\Framework\\\\TestCase',
        'PHPUnit\\Framework\\TestCase',
        'PHPUnit_Framework_TestCase',
        'TestCase',
    ];

    constructor(private files: Filesystem = new Filesystem()) {}

    fileName(fileName: string): boolean {
        return /\.git\.(php|inc)/.test(fileName) === false && /\.(php|inc)$/.test(fileName) === true;
    }

    className(fileName: string, content?: string) {
        content = content || this.files.getContent(fileName);
        const className = fileName
            .substr(fileName.replace(/\\/g, '/').lastIndexOf('/') + 1)
            .replace(/\.(php|inc)/i, '');

        if (new RegExp(`(abstract\\s+class|trait|interface)\\s+${className}`, 'i').test(content)) {
            return false;
        }

        return new RegExp(`class\\s+${className}\\s+extends\\s+(${this.testCaseClass.join('|')})`, 'i').test(content);
    }
}
