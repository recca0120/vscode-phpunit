import { Detail, Parser, TestCase, Type } from './parser';

import { tap } from '../helpers';

const parseString = require('xml2js').parseString;

function xml2json(content: string) {
    return new Promise((resolve, reject) => {
        parseString(content, { trim: true, async: true }, (error: any, result: any) => {
            error ? reject(error) : resolve(result);
        });
    });
}

export class JUnitParser extends Parser {
    parse(path: string): Promise<TestCase[]> {
        return this.parseFile(path);
    }

    parseString(content: string): Promise<TestCase[]> {
        return xml2json(content).then((json: any) => this.parseTestSuite(json.testsuites));
    }

    private parseTestSuite(testSuiteNode: any): Promise<TestCase[]> {
        if (testSuiteNode.testsuite) {
            return testSuiteNode.testsuite instanceof Array
                ? Promise.all([].concat(...testSuiteNode.testsuite.map(this.parseTestSuite.bind(this)))).then(items =>
                      items.reduce((prev, next) => prev.concat(next), [])
                  )
                : this.parseTestSuite(testSuiteNode.testsuite);
        }

        return testSuiteNode.testcase instanceof Array
            ? Promise.all([].concat(...testSuiteNode.testcase.map(this.parseTestCase.bind(this))))
            : Promise.all([this.parseTestCase(testSuiteNode.testcase)]);
    }

    protected parseTestCase(testCaseNode: any): Promise<TestCase> {
        const testCase: TestCase = {
            name: testCaseNode.$.name || null,
            class: testCaseNode.$.class,
            classname: testCaseNode.$.classname || null,
            file: testCaseNode.$.file,
            line: parseInt(testCaseNode.$.line || 1, 10),
            time: parseFloat(testCaseNode.$.time || 0),
            type: Type.PASSED,
        };

        const faultNode = this.getFaultNode(testCaseNode);

        if (faultNode === null) {
            return Promise.resolve(testCase);
        }

        const details: Detail[] = this.parseDetails(faultNode._);
        const currentFile = this.currentFile(details, testCase);
        const message = this.parseMessage(faultNode, details);

        return Promise.resolve(
            Object.assign(testCase, currentFile, {
                type: faultNode.type,
                fault: {
                    type: faultNode.$.type || '',
                    message: message,
                    details: this.filterDetails(details, currentFile),
                },
            })
        );
    }

    private getFaultNode(testCaseNode: any): any {
        const keys = Object.keys(testCaseNode);

        if (keys.indexOf('error') !== -1) {
            return tap(testCaseNode.error[0], (error: any) => {
                error.type = this.parseErrorType(error);
            });
        }

        if (keys.indexOf('warning') !== -1) {
            return tap(testCaseNode.warning[0], (warning: any) => {
                warning.type = Type.WARNING;
            });
        }

        if (keys.indexOf('failure') !== -1) {
            return tap(testCaseNode.failure[0], (failure: any) => {
                failure.type = Type.FAILURE;
            });
        }

        if (keys.indexOf('skipped') !== -1) {
            return {
                type: Type.SKIPPED,
                $: {
                    type: Type.SKIPPED,
                },
                _: '',
            };
        }

        if (keys.indexOf('incomplete') !== -1) {
            return {
                type: Type.INCOMPLETE,
                $: {
                    type: Type.INCOMPLETE,
                },
                _: '',
            };
        }

        return null;
    }

    private parseMessage(faultNode: any, details: Detail[]): string {
        const messages: string[] = details
            .reduce((result, detail) => {
                return result.replace(`${detail.file}:${detail.line}`, '').trim();
            }, this.crlf2lf(faultNode._))
            .split(/\r\n|\n/);

        const message = messages.length === 1 ? messages[0] : messages.slice(1).join('\n');

        return faultNode.$.type ? message.replace(new RegExp(`^${faultNode.$.type}:`, 'g'), '').trim() : message.trim();
    }

    private parseErrorType(errorNode: any): Type {
        const errorType = errorNode.$.type.toLowerCase();

        return (
            [Type.WARNING, Type.FAILURE, Type.INCOMPLETE, Type.RISKY, Type.SKIPPED, Type.FAILED].find(
                type => errorType.indexOf(type) !== -1
            ) || Type.ERROR
        );
    }

    private crlf2lf(content: string): string {
        return content.replace(/\r\n/g, '\n');
    }
}
