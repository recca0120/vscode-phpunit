import { parseString } from 'xml2js'
import { readFile } from 'fs'

export enum State {
    PASSED = 'passed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    INCOMPLETED = 'incompleted',
}

export function stateKeys() {
    return [State.PASSED, State.FAILED, State.SKIPPED, State.INCOMPLETED]
}

export interface Message {
    duration: number
    error: {
        fullMessage: string
        message: string
        name: string
    }
    fileName: string
    lineNumber: number
    state: State
    title: string
}

export class Parser {
    public async parseString(str: string): Promise<Message[]> {
        const json = await this.xml2json(str)

        return this.parseTestsuite(json.testsuites)
    }

    public async parseXML(fileName: string): Promise<Message[]> {
        const str = await this.readFileAsync(fileName)
        const messages: Message[] = await this.parseString(str)

        return messages
    }

    protected parseTestsuite(testsuite: any): Message[] {
        let messages: Message[] = []
        if (testsuite.testsuite) {
            messages = messages.concat(...testsuite.testsuite.map(this.parseTestsuite.bind(this)))
        } else if (testsuite.testcase) {
            messages = messages.concat(...testsuite.testcase.map(this.parseTestcase.bind(this)))
        }

        return messages
    }

    protected parseTestcase(testcase: any): Message {
        const testcaseAttr = testcase.$
        const duration = parseFloat(testcaseAttr.time || 0)
        const title = testcaseAttr.name || ''
        const error = this.getError(testcase)
        if (error === null) {
            return {
                duration,
                error: {
                    fullMessage: '',
                    message: '',
                    name: '',
                },
                fileName: testcaseAttr.file,
                lineNumber: (testcaseAttr.line || 1) - 1,
                state: State.PASSED,
                title,
            }
        }

        const errorAttr = error.$
        const errorChar = this.crlf2lf(error._)
        const name = this.crlf2lf(errorAttr.type)
        const state = this.parseState(errorAttr)
        const files = this.stringToFiles(errorChar)
        const file = this.parseFilePath(files) || {
            filePath: testcaseAttr.file,
            line: testcaseAttr.line,
        }

        return {
            duration,
            error: {
                fullMessage: this.parseFullMessage(errorChar, name, title),
                message: this.parseMessage(errorChar, files, name, title),
                name: '',
            },
            fileName: file.filePath,
            lineNumber: file.line - 1,
            state: state,
            title,
        }
    }

    protected getError(testcase: any): any {
        if (testcase.failure) {
            return testcase.failure[0]
        }

        if (testcase.error) {
            return testcase.error[0]
        }

        if (testcase.skipped) {
            return {
                $: {
                    type: State.SKIPPED,
                },
                _: '',
            }
        }

        return null
    }

    protected crlf2lf(str: string): string {
        return str.replace(/\r\n/g, '\n')
    }

    protected parseState(errAttr: any): State {
        const type = errAttr.type.toLowerCase()

        if (type.indexOf('skipped') !== -1) {
            return State.SKIPPED
        }

        if (type.indexOf('incomplete') !== -1) {
            return State.INCOMPLETED
        }

        if (type.indexOf('failed') !== -1) {
            return State.FAILED
        }

        return State.FAILED
    }

    protected stringToFiles(errorChar: string): Array<string> {
        return errorChar.split('\n').map(line => line.trim()).filter(line => /(.*):(\d+)/.test(line))
    }

    protected parseFilePath(files: Array<string>): any {
        return files
            .filter(path => {
                const paths = ['vendor/mockery/mockery', 'vendor/phpunit/phpunit']

                return new RegExp(paths.join('|'), 'ig').test(path.replace(/\\/g, '/')) === false
            })
            .map(path => {
                const [, file, line] = path.match(/(.*):(\d+)/)

                return { filePath: file, line: line }
            })
            .pop()
    }

    protected replaceFirst(str: string, search: string): string {
        const length = str.indexOf(search)

        return length === -1 ? str : str.substr(length + search.length)
    }

    protected parseMessage(message: string, files: Array<string>, name: string, title: string): string {
        message = this.crlf2lf(message)
        files.forEach(line => (message = message.replace(line, '')))
        message = message.replace(/\n+$/, '')
        message = this.replaceFirst(message, `${name}: `)
        message = this.replaceFirst(message, `${title}\n`)

        return message
    }

    protected parseFullMessage(message: string, name: string, title: string): string {
        message = this.crlf2lf(message)
        message = message.replace(/\n+$/, '')
        message = this.replaceFirst(message, `${name}: `)
        message = this.replaceFirst(message, `${title}\n`)

        return message
    }

    protected readFileAsync(filePath: string, encoding = 'utf8'): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(filePath, encoding, (error, data) => {
                return error ? reject(error) : resolve(data)
            })
        })
    }

    protected xml2json(xml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            parseString(xml, (error, json) => {
                return error ? reject(error) : resolve(json)
            })
        })
    }
}
