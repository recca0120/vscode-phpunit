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

    protected abstract parseTestCase(data: any);

    protected currentFile(details: Detail[], testCase: TestCase) {
        const detail: Detail = details.find(
            (detail: Detail) => testCase.file === detail.file && testCase.line !== detail.line
        );

        return detail
            ? detail
            : {
                  file: testCase.file,
                  line: testCase.line,
              };
    }

    protected filterDetails(details: Detail[], currentFile: Detail): Detail[] {
        return details.filter((detail: Detail) => detail.file !== currentFile.file && currentFile.line !== detail.line);
    }

    protected parseDetails(content: string): Detail[] {
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => /(.*):(\d+)$/.test(line))
            .map(path => {
                const [, file, line] = path.match(/(.*):(\d+)/);

                return {
                    file: file.trim(),
                    line: parseInt(line, 10),
                };
            });
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

    protected parseTestCase(testCaseNode: any): TestCase {
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
        const details: Detail[] = this.parseDetails(faultNode._);
        const currentFile = this.currentFile(details, testCase);
        const message = this.parseMessage(faultNode, details);

        return Object.assign(testCase, currentFile, {
            type: faultNode.type,
            fault: {
                type: faultNodeAttr.type || '',
                message: message,
                details: this.filterDetails(details, currentFile),
            },
        });
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
        return this.parseTestCase(this.groupByType(this.convertToArguments(content))));
    }

    protected parseTestCase(groups: TeamCity[][]): Promise<TestCase[]> {
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
                    line: 0,
                    time: parseFloat(finish.duration) / 1000,
                    type,
                };

                if (type !== Type.PASSED) {
                    const details: Detail[] = this.parseDetails(error.details);
                    const currentFile = this.currentFile(details, testCase);

                    Object.assign(testCase, currentFile, {
                        type: currentFile.line === 0 && testCase.type === Type.FAILURE ? Type.RISKY : testCase.type,
                        fault: {
                            message: error.message,
                            details: this.filterDetails(details, currentFile),
                        },
                    });

                    if (testCase.line !== 0) {
                        return Promise.resolve(testCase);
                    }
                }
                const pattern = new RegExp(`function\\s+${name}\\s*\\(`);

                return this.textRange.lineNumber(file, pattern).then(line => {
                    return Object.assign(testCase, {
                        line: line,
                    });
                });
            })
        );
    }

    private groupByType(items: TeamCity[]): TeamCity[][] {
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
