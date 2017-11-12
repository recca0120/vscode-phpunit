import { TextLine, TextLineFactory } from './text-line';
import { minimistString, tap, xml2js } from './helpers';

import { Filesystem } from './filesystem';
import { container } from './container';

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
    [Type.RISKY, Type.RISKY],
    [Type.SKIPPED, Type.SKIPPED],
    [Type.FAILED, Type.ERROR],
]);

export const TypeKeys = Array.from(TypeGroup.values()).reduce((types, next) => {
    return types.indexOf(next) === -1 ? types.concat([next]) : types;
}, []);

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
    constructor(
        protected files: Filesystem = container.files,
        protected textLineFactory: TextLineFactory = container.textLineFactory
    ) {
        this.textLineFactory.dispose();
    }

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
        return xml2js(content).then(json => this.parseTestSuite(json.testsuites));
    }

    private parseTestSuite(testSuiteNode: any): Promise<TestCase[]> {
        if (testSuiteNode.testsuite) {
            return testSuiteNode.testsuite instanceof Array
                ? Promise.all([].concat(...testSuiteNode.testsuite.map(this.parseTestSuite.bind(this)))).then(items => {
                      return items.reduce((prev, next) => prev.concat(next), []);
                  })
                : this.parseTestSuite(testSuiteNode.testsuite);
        }

        return testSuiteNode.testcase instanceof Array
            ? Promise.all([].concat(...testSuiteNode.testcase.map(this.parseTestCase.bind(this))))
            : Promise.all([this.parseTestCase(testSuiteNode.testcase)]);
    }

    protected parseTestCase(testCaseNode: any): Promise<TestCase> {
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
            return tap(testCaseNode.error, error => {
                error.type = this.parseErrorType(testCaseNode.error);
            });
        }

        if (keys.indexOf('warning') !== -1) {
            return tap(testCaseNode.warning, warning => {
                warning.type = Type.WARNING;
            });
        }

        if (keys.indexOf('failure') !== -1) {
            return tap(testCaseNode.failure, failure => {
                failure.type = Type.FAILURE;
            });
        }

        if (keys.indexOf('skipped') !== -1 || keys.indexOf('incomplete') !== -1) {
            return {
                type: Type.SKIPPED,
                _type: Type.SKIPPED,
                __text: '',
            };
        }

        return null;
    }

    private parseMessage(faultNode: any, details: Detail[]): string {
        const messages: string[] = details
            .reduce((result, detail) => {
                return result.replace(`${detail.file}:${detail.line}`, '').trim();
            }, this.crlf2lf(faultNode.__text))
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

    private crlf2lf(content: string): string {
        return content.replace(/\r\n/g, '\n');
    }
}

interface TeamCity {
    status: string;
    type?: string;
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

    parse(content: string): Promise<TestCase[]> {
        return this.parseString(content);
    }

    parseString(content: string): Promise<TestCase[]> {
        return this.parseTestCase(this.groupByType(this.parseTeamCity(content)));
    }

    protected parseTestCase(groups: TeamCity[][]): Promise<TestCase[]> {
        return Promise.all(
            groups.map(group => {
                if (group.length === 2) {
                    group.splice(1, 0, {
                        status: 'testPassed',
                    });
                }

                const [start, error, finish] = group;
                const [file, className, name] = start.locationHint
                    .replace(/php_qn:\/\//g, '')
                    .replace(/::\\/g, '::')
                    .split('::');

                const type = this.typeMap[error.status];

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

                return this.textLineFactory.searchFile(file, pattern, false).then((items: TextLine[]) => {
                    const textLine =
                        items.length > 0
                            ? items[0]
                            : {
                                  lineNumber: 0,
                              };

                    return Object.assign(testCase, {
                        line: textLine.lineNumber,
                    });
                });
            })
        );
    }

    private parseTeamCity(content: string): TeamCity[] {
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
                const teamCity: TeamCity = {
                    status: argv.shift(),
                };

                return argv.reduce((options, arg) => {
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
                }, teamCity);
            })
            .filter(item => ['testCount', 'testSuiteStarted', 'testSuiteFinished'].indexOf(item.status) === -1);
    }

    private groupByType(items: TeamCity[]): TeamCity[][] {
        let counter = 0;

        return items.reduce((results, item) => {
            if (!results[counter]) {
                results[counter] = [];
            }
            results[counter].push(item);

            if (item.status === 'testFinished') {
                counter++;
            }

            return results;
        }, []);
    }
}

export class ParserFactory {
    constructor(
        protected files: Filesystem = container.files,
        protected textLineFactory: TextLineFactory = container.textLineFactory
    ) {}

    public create(name): Parser {
        switch (name.toLowerCase()) {
            case 'teamcity':
                return new TeamCityParser(this.files, this.textLineFactory);
            default:
                return new JUnitParser(this.files, this.textLineFactory);
        }
    }
}
