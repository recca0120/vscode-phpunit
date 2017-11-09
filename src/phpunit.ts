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
    constructor(private parser = new Parser(), private process = new Process()) {
        super();
        this.process
            .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
            .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer));
    }

    handle(command: Command): Promise<TestCase[]> {
        return new Promise((resolve, reject) => {
            const args = command.getArguments();
            const xml = command.getXML();
            this.emit('stdout', `${args.join(' ')}\n\n`);

            this.process
                .once('exit', () => {
                    this.emit('stdout', '\n\n');
                    this.parser
                        .parseXML(xml)
                        .then(testCases => {
                            resolve(testCases);
                            command.clear();
                        })
                        .catch(error => {
                            console.error(error);
                            command.clear();
                        });
                })
                .spawn(args, { cwd: command.rootPath });
        });
    }
}

export class Command {
    private xml: string;

    constructor(
        private fileName: string,
        private args: Array<string> = [],
        private execPath: string = '',
        public rootPath: string = __dirname,
        private files = new Filesystem()
    ) {
        this.execPath = !this.execPath || this.execPath.trim() === 'phpunit' ? this.getExecutable() : this.execPath;
        this.xml = this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}}.xml`);
    }

    getXML() {
        return this.xml;
    }

    getArguments() {
        const execPath = this.execPath;

        if (!execPath) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return [execPath, this.fileName]
            .concat(['--log-junit', this.getXML()])
            .concat(this.getConfiguration())
            .concat(this.args);
    }

    clear() {
        this.files.unlink(this.getXML());
    }

    private getConfiguration(): Array<string> {
        const configurationFiles = ['phpunit.xml', 'phpunit.xml.dist'];
        for (let i = 0; i < configurationFiles.length; i++) {
            const configurationFile = `${this.rootPath}/${configurationFiles[i]}`;
            if (this.files.exists(configurationFile) === true) {
                return ['--configuration', configurationFile];
            }
        }

        return [];
    }

    private getExecutable(): string {
        const paths = [`${this.rootPath}/vendor/bin/phpunit`, `${this.rootPath}/phpunit.phar`, 'phpunit'];
        const commands = paths.map(path => this.files.find(path)).filter(command => command !== '');

        return commands.length === 0 ? '' : commands[0];
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
