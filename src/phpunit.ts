import { ChildProcess, SpawnOptions, spawn } from 'child_process'
import { Message, Parser } from './parser'

import { Filesystem } from './filesystem'
import { Project } from './project'
import { resolve as pathResolve } from 'path'
import { tmpdir } from 'os'

export class Phpunit {
    private rootPath: string
    private xmlPath: string = tmpdir()
    private outputCallback: Function = function() {}

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

    exec(fileName: string): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            const rootPath = this.rootPath
            const xmlFileName = pathResolve(this.xmlPath, `vscode-phpunit-junit-${new Date().getTime()}.xml`)
            const vendorPath = pathResolve(rootPath, 'vendor/bin/phpunit')

            const command =
                this.files.exists(vendorPath) === true ? this.files.find(vendorPath) : this.files.find(`phpunit`)

            if (!command) {
                reject()

                return
            }

            const args = [fileName, '--colors=always', '--log-junit', xmlFileName]

            this.process
                .stdErr(this.outputCallback)
                .stdOut(this.outputCallback)
                .onExit(async () => {
                    try {
                        const messages = await this.parser.parseXML(xmlFileName, true)
                        resolve(messages)
                    } catch (e) {
                        reject(e)
                    }
                })
                .spawn(command, args, { cwd: rootPath })
        })
    }

    noAnsi(str: string): string {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }
}

export class Process {
    private stdErrCallback: Function = function() {}
    private stdOutCallback: Function = function() {}
    private exitCallback: Function = function() {}

    spawn(command: string, args?: string[], options?: SpawnOptions): ChildProcess {
        const process: ChildProcess = spawn(command, args, options)
        process.stderr.on('data', this.stdErrCallback)
        process.stdout.on('data', this.stdOutCallback)
        process.on('exit', this.exitCallback)

        return process
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
}
