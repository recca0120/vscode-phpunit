import { existsSync, unlinkSync } from 'fs'

import { Filesystem } from './filesystem'
import { Parser } from './parser'
import { join } from 'path'
import { spawn } from 'child_process'
import { tmpdir } from 'os'

export class PHPUnit {
    public rootPath = __dirname
    public tmpPath = tmpdir()

    public constructor(private parser = new Parser(), private files = new Filesystem()) {}

    public setRootPath(rootPath: string): this {
        this.rootPath = rootPath

        return this
    }

    public setTmpDPath(tmpPath: string): this {
        this.tmpPath = tmpPath

        return this
    }

    public handle(filePath: string, output: any = null): Promise<any> {
        return new Promise(resolve => {
            if (/\.git\.php$/.test(filePath) === true) {
                resolve([])

                return
            }

            const rootPath = this.rootPath
            const xml = join(this.tmpPath, `vscode-phpunit-junit-${new Date().getTime()}.xml`)
            const vendorPath = `${rootPath}/vendor/bin/phpunit`
            const command =
                this.files.exists(vendorPath) === true ? this.files.find(vendorPath) : this.files.find(`phpunit`)

            if (!command) {
                resolve([])

                return
            }

            const args = [filePath, '--colors=always', '--log-junit', xml]
            const process = spawn(command, args, { cwd: rootPath })
            const cb = (buffer: Buffer) => {
                if (output !== null) {
                    output.append(this.noAnsi(buffer.toString()))
                }
            }
            process.stderr.on('data', cb)
            process.stdout.on('data', cb)
            process.on('exit', async () => {
                let messages: any = []
                if (existsSync(xml) === true) {
                    messages = await this.parser.parseXML(xml)
                    unlinkSync(xml)
                }

                resolve(messages)
            })
        })
    }

    public noAnsi(str: string): string {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }
}
