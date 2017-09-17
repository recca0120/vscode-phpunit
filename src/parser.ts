import { existsSync, readFile, unlinkSync } from 'fs'

import { parseString } from 'xml2js'

export enum State {
    PASSED = 'passed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    INCOMPLETED = 'incompleted',
}

export const StateKeys = [State.PASSED, State.FAILED, State.SKIPPED, State.INCOMPLETED]

export interface Position {
    fileName: string
    lineNumber: number
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
    async parseString(str: string): Promise<Message[]> {
        const json = await this.xml2json(str)

        return this.parseTestsuite(json.testsuites)
    }

    parseXML(fileName: string, testing: boolean = false): Promise<Message[]> {
        return new Promise(async resolve => {
            let messages: Message[] = []

            try {
                const xmlContent = await this.readFileAsync(fileName)
                messages = await this.parseString(xmlContent)
            } catch (e) {}

            if (testing === false && existsSync(fileName) === true) {
                try {
                    unlinkSync(fileName)
                } catch (e) {
                    setTimeout(() => {
                        unlinkSync(fileName)
                    }, 10000)
                }
            }

            resolve(messages)
        })
    }

    private parseTestsuite(testsuite: any): Message[] {
        let messages: Message[] = []
        if (testsuite.testsuite) {
            messages = messages.concat(...testsuite.testsuite.map(this.parseTestsuite.bind(this)))
        } else if (testsuite.testcase) {
            messages = messages.concat(...testsuite.testcase.map(this.parseTestcase.bind(this)))
        }

        return messages
    }

    private parseTestcase(testcase: any): Message {
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
        const callStack = this.parseCallStack(errorChar)
        const currentFile = this.getCurrentFile(callStack) || {
            fileName: testcaseAttr.file,
            lineNumber: testcaseAttr.line,
        }

        return {
            duration,
            error: {
                fullMessage: this.parseFullMessage(errorChar, name, title),
                message: this.parseMessage(errorChar, callStack, name, title),
                name: '',
            },
            fileName: currentFile.fileName,
            lineNumber: currentFile.lineNumber - 1,
            state: state,
            title,
        }
    }

    private getError(testcase: any): any {
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

    private crlf2lf(str: string): string {
        return str.replace(/\r\n/g, '\n')
    }

    private parseState(errAttr: any): State {
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

    private parseCallStack(errorChar: string): Position[] {
        return errorChar
            .split('\n')
            .map(line => line.trim())
            .filter(line => /(.*):(\d+)/.test(line))
            .map(path => {
                const [, fileName, lineNumber] = path.match(/(.*):(\d+)/)

                return {
                    fileName,
                    lineNumber: parseInt(lineNumber, 10),
                }
            })
    }

    private getCurrentFile(callStack: Position[]): Position {
        return callStack
            .filter(position => {
                const paths = ['vendor/mockery/mockery', 'vendor/phpunit/phpunit']

                return new RegExp(paths.join('|'), 'ig').test(position.fileName.replace(/\\/g, '/')) === false
            })
            .pop()
    }

    private replaceFirst(str: string, search: string): string {
        const length = str.indexOf(search)

        return length === -1 ? str : str.substr(length + search.length)
    }

    private parseMessage(message: string, files: Position[], name: string, title: string): string {
        message = this.crlf2lf(message)
        files.forEach(position => (message = message.replace(`${position.fileName}:${position.lineNumber}`, '')))
        message = message.replace(/\n+$/, '')
        message = this.replaceFirst(message, `${name}: `)
        message = this.replaceFirst(message, `${title}\n`)

        return message
    }

    private parseFullMessage(message: string, name: string, title: string): string {
        message = this.crlf2lf(message)
        message = message.replace(/\n+$/, '')
        message = this.replaceFirst(message, `${name}: `)
        message = this.replaceFirst(message, `${title}\n`)

        return message.length > 1000 ? `${message.substr(0, 1000)}...` : message
    }

    private readFileAsync(filePath: string, encoding = 'utf8'): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(filePath, encoding, (error, data) => {
                return error ? reject(error) : resolve(data)
            })
        })
    }

    private xml2json(xml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            parseString(xml, (error, json) => {
                return error ? reject(error) : resolve(json)
            })
        })
    }
}
