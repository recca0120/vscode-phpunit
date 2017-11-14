import { Detail, Parser, TestCase, Type } from './parser';
import { minimistString, tap } from '../helpers';

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
