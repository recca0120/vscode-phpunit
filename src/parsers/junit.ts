import { CachableFilesystem, FilesystemInterface } from '../filesystem';
import { Detail, Parser, TestCase, Type } from './parser';

import { IXmlParser } from './xml/interface';
import { TextLineFactory } from '../text-line';
import { FastXmlParser as XmlParser } from './xml/fast-xml-parser';
import { tap } from '../helpers';

export class JUnitParser extends Parser {
    constructor(
        protected files: FilesystemInterface = new CachableFilesystem(),
        protected textLineFactory: TextLineFactory = new TextLineFactory(),
        private xmlParser: IXmlParser = new XmlParser()
    ) {
        super(files, textLineFactory);
    }

    parse(path: string): Promise<TestCase[]> {
        return this.parseFile(path);
    }

    parseString(content: string): Promise<TestCase[]> {
        return this.xmlParser.parse(content).then((json: any) => this.parseTestSuite(json.testsuites));
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
        testCaseNode = this.xmlParser.map(testCaseNode);

        const testCase: TestCase = {
            name: testCaseNode._name || null,
            class: testCaseNode._class,
            classname: testCaseNode._classname || null,
            file: testCaseNode._file,
            line: parseInt(testCaseNode._line || 1, 10),
            time: parseFloat(testCaseNode._time || 0),
            type: Type.PASSED,
        };

        const faultNode = this.getFaultNode(testCaseNode);

        if (faultNode === null) {
            return Promise.resolve(testCase);
        }

        const details: Detail[] = this.parseDetails(faultNode.__text);
        const currentFile = this.currentFile(details, testCase);
        const message = this.parseMessage(faultNode, details);

        return Promise.resolve(
            Object.assign(testCase, currentFile, {
                type: faultNode.type,
                fault: {
                    type: faultNode._type || '',
                    message: message,
                    details: this.filterDetails(details, currentFile),
                },
            })
        );
    }

    private getFaultNode(testCaseNode: any): any {
        const keys = Object.keys(testCaseNode);

        if (keys.indexOf('error') !== -1) {
            return tap(testCaseNode.error, (error: any) => {
                error.type = this.parseErrorType(error);
            });
        }

        if (keys.indexOf('warning') !== -1) {
            return tap(testCaseNode.warning, (warning: any) => {
                warning.type = Type.WARNING;
            });
        }

        if (keys.indexOf('failure') !== -1) {
            return tap(testCaseNode.failure, (failure: any) => {
                failure.type = Type.FAILURE;
            });
        }

        if (keys.indexOf('skipped') !== -1) {
            return {
                type: Type.SKIPPED,
                _type: Type.SKIPPED,
                __text: '',
            };
        }

        if (keys.indexOf('incomplete') !== -1) {
            return {
                type: Type.INCOMPLETE,
                _type: Type.INCOMPLETE,
                __text: '',
            };
        }

        return null;
    }

    private parseMessage(faultNode: any, details: Detail[]): string {
        const messages: string[] = details
            .reduce((result, detail) => {
                return result.replace(`${detail.file}:${detail.line}`, '').trim();
            }, this.normalize(faultNode.__text))
            .split(/\r\n|\n/);

        const message = messages.length === 1 ? messages[0] : messages.slice(1).join('\n');

        return faultNode._type ? message.replace(new RegExp(`^${faultNode._type}:`, 'g'), '').trim() : message.trim();
    }

    private parseErrorType(errorNode: any): Type {
        const errorType = errorNode._type.toLowerCase();

        return (
            [Type.WARNING, Type.FAILURE, Type.INCOMPLETE, Type.RISKY, Type.SKIPPED, Type.FAILED].find(
                type => errorType.indexOf(type) !== -1
            ) || Type.ERROR
        );
    }

    private normalize(content: string): string {
        return content.replace(/\r\n/g, '\n').replace(/&#13;/g, '');
    }
}
