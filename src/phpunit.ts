import { ChildProcess, SpawnOptions, spawn } from 'child_process'
import { Message, Parser } from './parser'

import { Filesystem } from './filesystem'
import { Project } from './tester'
import { existsSync } from 'fs'
import { resolve as pathResolve } from 'path'
import { tmpdir } from 'os'

export enum State {
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    NOT_RUNNABLE = 'not_runnable',
    PROCESS_KILLED = 'process_killed',
}

export class Phpunit {
    private rootPath: string
    private configurationFile: string = null
    private xmlPath: string = tmpdir()
    private outputCallback: Function = function() {}
    private keywords: string[] = [
        'PHPUnit\\\\Framework\\\\TestCase',
        'PHPUnit\\Framework\\TestCase',
        'PHPUnit_Framework_TestCase',
        'TestCase',
    ]

    constructor(
        private project: Project = {},
        private parser = new Parser(),
        private files = new Filesystem(),
        private process = new Process()
    ) {
        this.rootPath = this.project.rootPath || __dirname
    }

    setOutput(outputCallback: Function): this {
        this.outputCallback = outputCallback

        return this
    }

    exec(fileName: string, content?: string): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            if (this.isExecutable(fileName, content) === false) {
                reject(State.NOT_RUNNABLE)

                return
            }

            const command = this.getCommand()
            const xmlFileName = pathResolve(this.xmlPath, `vscode-phpunit-junit-${new Date().getTime()}.xml`)
            const parameters: string[] = [command, fileName, '--colors=always', '--log-junit', xmlFileName]
            const configurationFile: string = this.getConfigurationFile()
            if (configurationFile) {
                parameters.push('--configuration')
                parameters.push(configurationFile)
            }

            this.process
                .stdErr(this.outputCallback)
                .stdOut(this.outputCallback)
                .onExit(async () => {
                    try {
                        const messages = await this.parser.parseXML(xmlFileName)
                        resolve(messages)
                    } catch (e) {
                        reject(State.PHPUNIT_EXECUTE_ERROR)
                    }
                })
                .spawn(parameters, { cwd: this.rootPath })
        })
    }

    getLastOutput(): string {
        return this.noAnsi(this.process.getLastOutput())
    }

    noAnsi(content: string): string {
        return content.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }

    private isExecutable(fileName: string, content: string): boolean {
        if (
            /\.(php|inc)$/.test(fileName) === false ||
            /\.git\.php$/.test(fileName) === true ||
            this.isAbstract(fileName, content) === true ||
            this.isPhpunit(content) === false
        ) {
            return false
        }

        return true
    }

    private isPhpunit(content: string): boolean {
        return new RegExp(this.keywords.join('|'), 'i').test(content)
    }

    private isAbstract(fileName: string, content: string) {
        const className = fileName.substr(fileName.replace(/\\/g, '/').lastIndexOf('/') + 1).replace(/\.(php|inc)/i, '')

        return new RegExp(`(abstract|trait|interface)\s+${className}`, 'i').test(content)
    }

    private getConfigurationFile(): string {
        if (this.configurationFile !== null) {
            return this.configurationFile
        }

        const configurationFiles = ['phpunit.xml', 'phpunit.xml.dist']

        for (let i = 0; i < configurationFiles.length; i++) {
            const configurationFile = `${this.rootPath}/${configurationFiles[i]}`
            if (existsSync(configurationFile) === true) {
                return (this.configurationFile = configurationFile)
            }
        }

        return (this.configurationFile = '')
    }

    private getCommand(): string {
        const vendorPath = pathResolve(this.rootPath, 'vendor/bin/phpunit')
        const command =
            this.files.exists(vendorPath) === true ? this.files.find(vendorPath) : this.files.find('phpunit')

        if (!command) {
            throw State.PHPUNIT_NOT_FOUND
        }

        return command
    }
}

export class Process {
    lastOutput: string = ''
    stdErrCallback: Function = function() {}
    stdOutCallback: Function = function() {}
    exitCallback: Function = function() {}
    private process: ChildProcess = null

    spawn(parameters: string[], options?: SpawnOptions): ChildProcess {
        this.lastOutput = ''
        const command: string = parameters.shift()

        if (this.process) {
            this.process.kill('SIGKILL')
        }

        this.process = spawn(command, parameters, options)
        this.process.stderr.on('data', this.stdErrCallback)
        this.process.stdout.on('data', this.stdOutCallback)
        this.process.on('exit', this.exitCallback)

        this.process.stderr.on('data', this.setLastOutput.bind(this))
        this.process.stdout.on('data', this.setLastOutput.bind(this))

        return this.process
    }

    stdErr(callback: Function): this {
        this.stdErrCallback = callback

        return this
    }

    stdOut(callback: Function): this {
        this.stdOutCallback = callback

        return this
    }

    onExit(callback: Function): this {
        this.exitCallback = callback

        return this
    }

    getLastOutput(): string {
        return this.lastOutput
    }

    private setLastOutput(buffer: Buffer) {
        this.lastOutput += buffer.toString()
    }
}
