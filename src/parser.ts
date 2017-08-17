import { parseString } from 'xml2js'
import { readFile } from 'fs'

export class Parser {
  public async parseString(str: string): Promise<any> {
    const json = await this.xml2json(str)

    return this.parseTestsuite(json.testsuites)
  }

  public async parseXML(fileName: string): Promise<any> {
    const str = await this.readFileAsync(fileName)
    const messages = await this.parseString(str)

    return messages
  }

  protected parseTestsuite(testsuite: any): any {
    let messages = []
    if (testsuite.testsuite) {
      messages = messages.concat(...testsuite.testsuite.map(this.parseTestsuite.bind(this)))
    } else if (testsuite.testcase) {
      messages = messages.concat(...testsuite.testcase.map(this.parseTestcase.bind(this)))
    }

    return messages
  }

  protected parseTestcase(testcase: any): any {
    const testcaseAttr = testcase.$
    const duration = parseFloat(testcaseAttr.time || 0)
    const title = testcaseAttr.name || ''
    const error = this.getError(testcase)
    if (error === null) {
      return {
        duration,
        filePath: testcaseAttr.file,
        lineNumber: (testcaseAttr.line || 1) - 1,
        state: 'passed',
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
      lineNumber: testcaseAttr.line,
    }

    return {
      duration,
      error: {
        message: this.parseMessage(errorChar, files, name, title),
        name: '',
      },
      filePath: file.filePath,
      lineNumber: file.lineNumber - 1,
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
          type: 'skipped',
        },
        _: '',
      }
    }

    return null
  }

  protected crlf2lf(str: string): string {
    return str.replace(/\r\n/g, '\n')
  }

  protected parseState(errAttr: any): string {
    const type = errAttr.type.toLowerCase()

    if (type.indexOf('skipped') !== -1) {
      return 'skipped'
    }

    if (type.indexOf('incomplete') !== -1) {
      return 'incomplete'
    }

    if (type.indexOf('failed') !== -1) {
      return 'failed'
    }

    return 'failed'
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

        return { filePath: file, lineNumber: line }
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
