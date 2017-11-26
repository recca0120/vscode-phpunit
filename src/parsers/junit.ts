import { CachableFilesystem, FilesystemInterface } from '../filesystem';
import { Detail, Parser, TestCase, Type } from './parser';

import { TextLineFactory } from '../text-line';
import { tap } from '../helpers';

interface XmlParser {
    parse(content: string): Promise<any>;
    map(testCaseNode: any): any;
}

export class FastXmlParser implements XmlParser {
    parse(content: string): Promise<any> {
        return new Promise((resolve, reject) => {
            resolve(
                require('fast-xml-parser').parse(content, {
                    attrPrefix: '_',
                    textNodeName: '__',
                    ignoreNonTextNodeAttr: false,
                    ignoreTextNodeAttr: false,
                    ignoreNameSpace: false,
                })
            );
        });
    }

    map(testCaseNode: any): any {
        return testCaseNode;
    }
}

export class Xml2jsParser implements XmlParser {
    parse(content: string): Promise<any> {
        return new Promise((resolve, reject) => {
            require('xml2js').parseString(content, { trim: true, async: true }, (error: any, result: any) => {
                error ? reject(error) : resolve(result);
            });
        });
    }

    map(testCaseNode: any): any {
        const node: any = {
            _name: testCaseNode.$.name,
            _class: testCaseNode.$.class,
            _classname: testCaseNode.$.classname,
            _file: testCaseNode.$.file,
            _line: testCaseNode.$.line,
            _assertions: testCaseNode.$.assertions,
            _time: testCaseNode.$.time,
        };

        const errorAttribute: string[] = Object.keys(testCaseNode).filter(key => key.indexOf('$') === -1);

        if (errorAttribute.length > 0) {
            node[errorAttribute[0]] = this.faultNode(testCaseNode[errorAttribute[0]]);
        }

        return node;
    }

    private faultNode(faultNode: any): any {
        const node = faultNode[0];

        return node === ''
            ? ''
            : {
                  _type: node.$.type,
                  __: node._,
              };
    }
}

export class JUnitParser extends Parser {
    constructor(
        protected files: FilesystemInterface = new CachableFilesystem(),
        protected textLineFactory: TextLineFactory = new TextLineFactory(),
        private xmlParser: XmlParser = new Xml2jsParser()
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

        const details: Detail[] = this.parseDetails(faultNode.__);
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
                __: '',
            };
        }

        if (keys.indexOf('incomplete') !== -1) {
            return {
                type: Type.INCOMPLETE,
                _type: Type.INCOMPLETE,
                __: '',
            };
        }

        return null;
    }

    private parseMessage(faultNode: any, details: Detail[]): string {
        const messages: string[] = details
            .reduce((result, detail) => {
                return result.replace(`${detail.file}:${detail.line}`, '').trim();
            }, this.normalize(faultNode.__))
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
