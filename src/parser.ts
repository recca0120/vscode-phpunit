import { isWindows, minimistString, tap } from './helpers';

import { Filesystem } from './filesystem';
import { TextRange } from './text-range';
import { parseString } from 'xml2js';

const os = isWindows() ? 'windows' : 'unix';

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
    constructor(private files: Filesystem = new Filesystem()) {}

    abstract parse(content: any): Promise<TestCase[]>;

    abstract parseString(content: string): Promise<TestCase[]>;

    parseFile(fileName: string): Promise<TestCase[]> {
        return this.files.getAsync(fileName).then((content: string) => this.parseString(content));
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
            line: parseInt(testCaseNodeAttr.line || 1, 10),
            time: parseFloat(testCaseNodeAttr.time || 0),
            type: Type.PASSED,
        };

        const faultNode = this.getFaultNode(testCaseNode);

        if (faultNode === null) {
            return testCase;
        }

        const faultNodeAttr = faultNode.$;
        const details: Detail[] = this.parseDetails(faultNode);
        const message = this.parseMessage(faultNode, details);

        return Object.assign(testCase, this.currentFile(details, testCase), {
            type: faultNode.type,
            fault: {
                type: faultNodeAttr.type || '',
                message: message,
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

    private parseMessage(faultNode: any, details: Detail[]): string {
        const messages: string[] = details
            .reduce((result, detail) => {
                return result.replace(`${detail.file}:${detail.line}`, '').trim();
            }, this.crlf2lf(faultNode._))
            .split(/\r\n|\n/);

        const message = messages.length === 1 ? messages[0] : messages.slice(1).join('\n');

        return faultNode.$.type ? message.replace(new RegExp(`^${faultNode.$.type}:`, 'g'), '').trim() : message.trim();
    }

    private parseDetails(faultNode: any): Detail[] {
        return faultNode._.split('\n')
            .map(line => line.trim())
            .filter(line => /(.*):(\d+)$/.test(line))
            .map(path => {
                const [, file, line] = path.match(/(.*):(\d+)/);

                return {
                    file,
                    line: parseInt(line, 10),
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

interface TeamCity {
    type: string;
    count?: string;
    name?: string;
    flowId?: string;
    locationHint?: string;
    duration?: string;
    message?: string;
    details?: string;
}

export class TeamCityParser extends Parser {
    private typeMap = {
        testPassed: Type.PASSED,
        testFailed: Type.FAILURE,
        testIgnored: Type.SKIPPED,
    };

    constructor(private textRange = new TextRange(), files: Filesystem = new Filesystem()) {
        super(files);
    }

    parse(content: string): Promise<TestCase[]> {
        return this.parseString(content);
    }

    parseString(content: string): Promise<TestCase[]> {
        return this.convertToTestCase(this.groupByType(this.convertToArguments(content)));
    }

    private convertToTestCase(groups: Array<TeamCity[]>): Promise<TestCase[]> {
        return Promise.all(
            groups.map(group => {
                if (group.length === 2) {
                    group.splice(1, 0, {
                        type: 'testPassed',
                    });
                }

                const [start, error, finish] = group;
                const [file, className, name] = start.locationHint
                    .replace(/php_qn:\/\//g, '')
                    .replace(/::\\/g, '::')
                    .split('::');

                const type = this.typeMap[error.type];

                const testCase: TestCase = {
                    name,
                    class: className.substr(className.lastIndexOf('\\') + 1),
                    classname: null,
                    file,
                    line: 1,
                    time: parseFloat(finish.duration) / 1000,
                    type,
                };

                if (type !== Type.PASSED) {
                    const details: Array<Detail> = this.convertToDetail(error.details);
                    const detail: Detail = details.shift();

                    Object.assign(testCase, {
                        type: !detail && testCase.type === Type.FAILURE ? Type.RISKY : testCase.type,
                        fault: {
                            message: error.message,
                            details: details,
                        },
                    });

                    if (detail) {
                        return Promise.resolve(Object.assign(testCase, detail));
                    }
                }

                return this.textRange.lineNumber(file, `function ${name}`).then(line => {
                    return Object.assign(testCase, {
                        line: line,
                    });
                });
            })
        );
    }

    private convertToDetail(content: string): Array<Detail> {
        return content
            .split('|n')
            .filter(line => !!line)
            .reverse()
            .map(path => {
                const [, file, line] = path.match(/(.*):(\d+)/);

                return {
                    file,
                    line: parseInt(line, 10),
                };
            });
    }

    private groupByType(items: TeamCity[]): Array<TeamCity[]> {
        let counter = 0;

        return items.reduce((results, item) => {
            if (!results[counter]) {
                results[counter] = [];
            }
            results[counter].push(item);

            if (item.type === 'testFinished') {
                counter++;
            }

            return results;
        }, []);
    }

    private convertToArguments(content: string): TeamCity[] {
        return content
            .split(/\r|\n/)
            .filter(line => /^##teamcity/.test(line))
            .map(line => {
                line = line
                    .trim()
                    .replace(/^##teamcity\[|\]$/g, '')
                    .replace(/\\/g, '||')
                    .replace(/\|\'/g, "\\'");

                const argv: string[] = minimistString(line)._;
                const type: string = argv.shift();

                return argv.reduce(
                    (options, arg) => {
                        return tap(options, opts => {
                            const split = arg.split('=');
                            const key = split.shift();
                            const value = split
                                .join('=')
                                .replace(/\|\|/g, '\\')
                                .replace(/\|n/g, '\n')
                                .trim();

                            opts[key] = value;
                        });
                    },
                    {
                        type,
                    }
                );
            })
            .filter(item => ['testCount', 'testSuiteStarted', 'testSuiteFinished'].indexOf(item.type) === -1);
    }
}

export class ParserFactory {
    public create(name): Parser {
        switch (name.toLowerCase()) {
            case 'teamcity':
                return new TeamCityParser();
            default:
                return new JUnitParser();
        }
    }
}
