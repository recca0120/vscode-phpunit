import { parseString } from 'xml2js';
import { readFile } from 'fs';

const minimistString = require('minimist-string');

export enum Type {
    PASSED = 'passed',
    ERROR = 'error',
    WARNING = 'warning',
    FAILURE = 'failure',
    INCOMPLETE = 'incomplete',
    RISKY = 'risky',
    SKIPPED = 'skipped',
    FAILED = 'failed',
}

export const TypeGroup = new Map<Type, Type>([
    [Type.PASSED, Type.PASSED],
    [Type.ERROR, Type.ERROR],
    [Type.WARNING, Type.SKIPPED],
    [Type.FAILURE, Type.ERROR],
    [Type.INCOMPLETE, Type.INCOMPLETE],
    [Type.RISKY, Type.ERROR],
    [Type.SKIPPED, Type.SKIPPED],
    [Type.FAILED, Type.ERROR],
]);

export const TypeKeys = [Type.PASSED, Type.ERROR, Type.INCOMPLETE, Type.SKIPPED];

export interface Detail {
    file: string;
    line: number;
}

export interface Fault {
    message: string;
    type?: string;
    details?: Detail[];
}

export interface TestCase {
    name: string;
    class: string;
    classname?: string;
    file: string;
    line: number;
    time: number;
    type: Type;
    fault?: Fault;
}

export abstract class Parser {
    abstract parse(content: any): Promise<TestCase[]>;

    abstract parseString(content: string): Promise<TestCase[]>;

    parseFile(fileName: string): Promise<TestCase[]> {
        return this.readFileAsync(fileName).then((content: string) => this.parseString(content));
    }

    protected readFileAsync(filePath: string, encoding = 'utf8'): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(filePath, encoding, (error, data) => {
                return error ? reject(error) : resolve(data);
            });
        });
    }
}

export class ParserFactory {
    private map = {
        'teamcity': TeamCityParser,
        'junit': JUnitParser,
    }
    
    public create(name): Parser {
        name = name.toLowerCase();
        if (!this.map[name]) {
            throw Error('wrong parser');
        }

        return new this.map[name];
    }
}

export class JUnitParser extends Parser {
    parse(fileName: string): Promise<TestCase[]> {
        return this.parseFile(fileName);
    }

    parseString(content: string): Promise<TestCase[]> {
        return this.xml2json(content).then(json => this.parseTestSuite(json.testsuites));
    }

    private parseTestSuite(testSuitNode: any): TestCase[] {
        let testCase: TestCase[] = [];
        if (testSuitNode.testsuite) {
            testCase = testCase.concat(...testSuitNode.testsuite.map(this.parseTestSuite.bind(this)));
        } else if (testSuitNode.testcase) {
            testCase = testCase.concat(...testSuitNode.testcase.map(this.parseTestCase.bind(this)));
        }

        return testCase;
    }

    private parseTestCase(testCaseNode: any): TestCase {
        const testCaseNodeAttr = testCaseNode.$;

        const testCase: TestCase = {
            name: testCaseNodeAttr.name || null,
            class: testCaseNodeAttr.class,
            classname: testCaseNodeAttr.classname || null,
            file: testCaseNodeAttr.file,
            line: parseInt(testCaseNodeAttr.line || 1, 10) - 1,
            time: parseFloat(testCaseNodeAttr.time || 0),
            type: Type.PASSED,
        };

        const faultNode = this.getFaultNode(testCaseNode);

        if (faultNode === null) {
            return testCase;
        }

        const faultNodeAttr = faultNode.$;
        let message: string = this.parseMessage(faultNode);
        const details: Detail[] = this.parseDetails(message);

        details.forEach((detail: Detail) => {
            message = message.replace(`${detail.file}:${detail.line + 1}`, '').trim();
        });

        return Object.assign(testCase, this.currentFile(details, testCase), {
            type: faultNode.type,
            fault: {
                type: faultNodeAttr.type || '',
                message: message.trim(),
                details: details.filter((detail: Detail) => detail.file !== testCase.file),
            },
        });
    }

    private currentFile(details: Detail[], testCase: TestCase) {
        details = details.filter((detail: Detail) => testCase.file === detail.file);

        return details.length !== 0
            ? details[details.length - 1]
            : {
                  file: testCase.file,
                  line: testCase.line,
              };
    }

    private getFaultNode(testCaseNode: any): any {
        if (testCaseNode.error) {
            return Object.assign(
                {
                    type: this.parseErrorType(testCaseNode.error[0]),
                },
                testCaseNode.error[0]
            );
        }

        if (testCaseNode.warning) {
            return Object.assign(
                {
                    type: Type.WARNING,
                },
                testCaseNode.warning[0]
            );
        }

        if (testCaseNode.failure) {
            return Object.assign(
                {
                    type: Type.FAILURE,
                },
                testCaseNode.failure[0]
            );
        }

        if (testCaseNode.skipped || testCaseNode.incomplete) {
            return {
                type: Type.SKIPPED,
                $: {
                    type: Type.SKIPPED,
                },
                _: '',
            };
        }

        return null;
    }

    private parseMessage(faultNode: any): string {
        return this.crlf2lf(faultNode._);
    }

    private parseDetails(message: string): Detail[] {
        return message
            .split('\n')
            .map(line => line.trim())
            .filter(line => /(.*):(\d+)$/.test(line))
            .map(path => {
                const [, file, line] = path.match(/(.*):(\d+)/);

                return {
                    file,
                    line: parseInt(line, 10) - 1,
                };
            });
    }

    private parseErrorType(errorNode: any): Type {
        const errorType = errorNode.$.type.toLowerCase();

        if (errorType.indexOf(Type.SKIPPED) !== -1) {
            return Type.SKIPPED;
        }

        if (errorType.indexOf(Type.INCOMPLETE) !== -1) {
            return Type.INCOMPLETE;
        }

        if (errorType.indexOf(Type.FAILED) !== -1) {
            return Type.FAILED;
        }

        return Type.ERROR;
    }

    private crlf2lf(str: string): string {
        return str.replace(/\r\n/g, '\n');
    }

    private xml2json(xml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            parseString(xml, (error, json) => {
                return error ? reject(error) : resolve(json);
            });
        });
    }
}

export class TeamCityParser extends Parser {
    parse(content: string): Promise<TestCase[]> {
        return Promise.resolve([]);
    }
    
    parseString(content: string): Promise<TestCase[]> {
        
        content.split(/\r|\n/).filter(line => /^##teamcity/.test(line)).map((line) => {
            line = line
                .trim()
                .replace(/^##teamcity\[|\]$/g, '');
            // console.log(minimistString(line))
        });
 
        return Promise.resolve([]);
    }
}