import { Test, Assertion, Detail, Fault, Type } from './phpunit';
import { FilesystemContract, Filesystem } from './filesystem';
import { groupBy, tap } from './helpers';
import { PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, DiagnosticRelatedInformation } from 'vscode-languageserver';

export class Collection {
    private errorTypes: Type[] = [Type.ERROR, Type.FAILED, Type.FAILURE, Type.RISKY];
    private items: Map<string, Test[]> = new Map<string, Test[]>();

    constructor(private files: FilesystemContract = new Filesystem()) {}

    put(tests: Test[]): Collection {
        const groups: Map<string, Test[]> = groupBy(tests, 'uri');

        for (const key of groups.keys()) {
            this.items.set(key, this.merge(this.items.get(key) || [], groups.get(key) || []));
        }

        return this;
    }

    get(uri: string): Test[] {
        return this.items.get(this.files.uri(uri)) || [];
    }

    map(callback: Function): any[] {
        const items: any[] = [];

        this.forEach((tests: Test[], uri: string) => {
            items.push(callback(tests, uri));
        });

        return items;
    }

    forEach(callback: Function): Collection {
        this.items.forEach((tests: Test[], uri: string) => {
            callback(tests, uri);
        });

        return this;
    }

    all(): Map<string, Test[]> {
        return this.items;
    }

    transformToDiagnoics() {
        return tap(new Map<string, PublishDiagnosticsParams>(), (map: Map<string, PublishDiagnosticsParams>) => {
            this.forEach((tests: Test[], uri: string) => {
                map.set(uri, {
                    uri,
                    diagnostics: tests
                        .filter(this.filterByType.bind(this))
                        .map((test: Test) => this.transformToDiagonstic(test)),
                } as PublishDiagnosticsParams);
            });
        });
    }

    transformToAssertions(): Map<string, Assertion[]> {
        const assertions: Assertion[] = [];
        this.forEach((tests: Test[]) => {
            tests.forEach((test: Test) => {
                const message: string = test.fault ? test.fault.message : '';
                const details: Detail[] = test.fault && test.fault.details ? test.fault.details : [];
                const type: string = test.fault && test.fault.type ? test.fault.type : '';
                const fault: Fault = {
                    type,
                    message,
                };

                assertions.push(
                    Object.assign({}, test, {
                        fault: fault,
                    })
                );

                details.forEach((detail: Detail) => {
                    assertions.push(
                        Object.assign({}, test, {
                            uri: detail.uri,
                            range: detail.range,
                            fault: Object.assign({}, fault, {
                                details: [
                                    {
                                        uri: test.uri,
                                        range: test.range,
                                    },
                                ],
                            }),
                        })
                    );
                });
            });
        });

        return groupBy(assertions, 'uri');
    }

    private transformToDiagonstic(test: Test): Diagnostic {
        return {
            severity: test.type === Type.RISKY ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
            range: test.range,
            message: test.fault ? test.fault.message : '',
            relatedInformation: this.transformToRelatedInformation(test),
            source: 'PHPUnit',
        };
    }

    private transformToRelatedInformation(test: Test): DiagnosticRelatedInformation[] {
        if (!test.fault || !test.fault.details) {
            return [];
        }
        const message: string = test.fault.message;

        return test.fault.details.map((detail: Detail) => {
            return {
                location: detail,
                message: message,
            };
        });
    }

    private filterByType(test: Test): boolean {
        return this.errorTypes.indexOf(test.type) !== -1;
    }

    private merge(oldTests: Test[], newTests: Test[]): Test[] {
        const merged: Test[] = oldTests
            .filter((oldTest: Test) => {
                for (const newTest of newTests) {
                    if (oldTest.uri === newTest.uri && oldTest.name === newTest.name) {
                        return false;
                    }
                }

                return true;
            })
            .concat(newTests);

        merged.sort((a: Test, b: Test) => {
            return a.range.start.line > b.range.start.line ? 1 : -1;
        });

        return merged;
    }
}
