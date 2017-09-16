import { ChildProcess, spawn } from 'child_process'
import { Message, Parser } from './parser'
import { existsSync, unlinkSync } from 'fs'

import { Filesystem } from './filesystem'
import { join } from 'path'
import { tmpdir } from 'os'

export class Phpunit {
    public rootPath = __dirname

    public xmlPath = tmpdir()

    private outputCallback: Function = function() {}

    public constructor(private parser = new Parser(), private files = new Filesystem()) {}

    public setRootPath(rootPath: string): this {
        this.rootPath = rootPath

        return this
    }

    public setXmlDPath(xmlPath: string): this {
        this.xmlPath = xmlPath

        return this
    }

    public setOutput(outputCallback: Function): this {
        this.outputCallback = outputCallback

        return this
    }

    public exec(fileName: string): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            const rootPath = this.rootPath
            const xml = join(this.xmlPath, `vscode-phpunit-junit-${new Date().getTime()}.xml`)
            const vendorPath = `${rootPath}/vendor/bin/phpunit`
            const command =
                this.files.exists(vendorPath) === true ? this.files.find(vendorPath) : this.files.find(`phpunit`)

            if (!command) {
                reject()

                return
            }

            const args = [fileName, '--colors=always', '--log-junit', xml]
            const process: ChildProcess = spawn(command, args, { cwd: rootPath })
            process.stderr.on('data', this.outputCallback)
            process.stdout.on('data', this.outputCallback)
            process.on('exit', async () => {
                if (existsSync(xml) === false) {
                    reject()
                    return
                }

                const messages = await this.parser.parseXML(xml)
                unlinkSync(xml)
                resolve(messages)
            })
        })
    }
}
