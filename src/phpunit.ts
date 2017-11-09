import { ChildProcess, SpawnOptions, spawn } from 'child_process';
import { Parser, TestCase } from './parser';

import { EventEmitter } from 'events';
import { Filesystem } from './filesystem';
import { Project } from './tester';

export enum State {
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

export class PHPUnit extends EventEmitter {
    private rootPath: string;
    private configurationFile: string = null;

    constructor(
        private project: Project = {},
        private parser = new Parser(),
        private files = new Filesystem(),
        private process = new Process(),
        private validator = new Validator()
    ) {
        super();
        this.rootPath = this.project.rootPath || __dirname;
        this.process
            .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
            .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer));
    }

    run(fileName: string, content?: string): Promise<TestCase[]> {
        return new Promise((resolve, reject) => {
            const command = this.getCommand();

            if (!command) {
                return reject(State.PHPUNIT_NOT_FOUND);
            }

            if (this.validator.fileName(fileName) === false) {
                return reject(State.PHPUNIT_NOT_PHP);
            }

            if (this.validator.className(fileName, content) === false) {
                return reject(State.PHPUNIT_NOT_TESTCASE);
            }

            const xmlFileName = this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`);
            const parameters: string[] = [
                command,
                fileName,
                // '--colors=always',
                '--log-junit',
                xmlFileName,
            ];
            const configurationFile: string = this.getConfigurationFile();
            if (configurationFile) {
                parameters.push('--configuration');
                parameters.push(configurationFile);
            }

            this.emit('stdout', `${parameters.join(' ')}\n\n`);

            this.process
                .once('exit', async () => {
                    this.emit('stdout', '\n\n');

                    try {
                        const testCases: TestCase[] = await this.parser.parseXML(xmlFileName);
                        resolve(testCases);
                    } catch (e) {
                        reject(State.PHPUNIT_EXECUTE_ERROR);
                    } finally {
                        this.files.unlink(xmlFileName);
                    }
                })
                .spawn(parameters, { cwd: this.rootPath });
        });
    }

    private getConfigurationFile(): string {
        if (this.configurationFile !== null) {
            return this.configurationFile;
        }

        const configurationFiles = ['phpunit.xml', 'phpunit.xml.dist'];

        for (let i = 0; i < configurationFiles.length; i++) {
            const configurationFile = `${this.rootPath}/${configurationFiles[i]}`;
            if (this.files.exists(configurationFile) === true) {
                return (this.configurationFile = configurationFile);
            }
        }

        return (this.configurationFile = '');
    }

    private getCommand(): string {
        const paths = [`${this.rootPath}/vendor/bin/phpunit`, `${this.rootPath}/phpunit.phar`, 'phpunit'];

        const commands = paths
            .map(path => {
                return this.files.find(path);
            })
            .filter(command => command !== '');

        return commands.length > 0 ? commands[0] : '';
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
