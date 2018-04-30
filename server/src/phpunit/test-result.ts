import { Assertion, Detail, Test, TestNode, Type, Fault, State } from './common';
import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity } from 'vscode-languageserver-types';
import { Filesystem, FilesystemContract } from '../filesystem';
import { groupBy, tap, when } from '../helpers';

export class TestResult {
    private errorTypes: Type[] = [Type.ERROR, Type.FAILED, Type.FAILURE, Type.RISKY];
    private items: Map<string, Test[]> = new Map<string, Test[]>();

    constructor(private files: FilesystemContract = new Filesystem()) {}

    put(tests: Test[]): TestResult {
        const groups: Map<string, Test[]> = groupBy(tests, 'uri');

        for (const key of groups.keys()) {
            this.items.set(key, this.merge(this.asArray(this.items.get(key)), this.asArray(groups.get(key))));
        }

        return this;
    }

    get(uri: string): Test[] {
        return this.asArray(this.items.get(this.files.uri(uri)));
    }

    forEach(callback: Function): TestResult {
        this.items.forEach((tests: Test[], uri: string) => {
            callback(tests, uri);
        });

        return this;
    }

    asTestNodes(uri: string): TestNode[] {
        return this.asArray(this.asAssertions().get(uri)).map((assertion: Assertion) => {
            return Object.assign({}, this.cloneTest(assertion.related), {
                range: assertion.range,
            });
        });
    }

    asDiagnoics(): Map<string, Diagnostic[]> {
        return tap(new Map<string, Diagnostic[]>(), (map: Map<string, Diagnostic[]>) => {
            this.forEach((tests: Test[], uri: string) => {
                map.set(
                    uri,
                    tests
                        .map((test: Test) => this.cloneTest(test, true))
                        .filter((test: Test) => this.filterDetails(test))
                        .filter(this.filterByType.bind(this))
                        .map((test: Test) => this.transformToDiagonstic(test))
                );
            });
        });
    }

    asAssertions(keepDetails: boolean = false): Map<string, Assertion[]> {
        const assertions: Assertion[] = [];
        this.forEach((tests: Test[]) => {
            tests.forEach((test: Test) => {
                const details: Detail[] = this.getDetails(test.fault);
                const related: Test = this.cloneTest(test, keepDetails);

                assertions.push({
                    uri: test.uri,
                    range: test.range,
                    related: related,
                });

                details.forEach((detail: Detail) => {
                    assertions.push({
                        uri: detail.uri,
                        range: detail.range,
                        related: related,
                    });
                });
            });
        });

        return groupBy(assertions, 'uri');
    }

    asState() {
        const state: State = {
            failed: 0,
            warning: 0,
            passed: 0,
        };

        this.forEach((tests: Test[]) => {
            tests.forEach((test: Test) => {
                if ([Type.ERROR, Type.FAILURE, Type.FAILED].indexOf(test.type) !== -1) {
                    state.failed++;
                } else if ([Type.INCOMPLETE, Type.RISKY, Type.SKIPPED, Type.WARNING].indexOf(test.type) !== -1) {
                    state.warning++;
                } else {
                    state.passed++;
                }
            });
        });

        return state;
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
        return when(
            test.fault,
            (fault: Fault) =>
                this.getDetails(fault).map((detail: Detail) => ({
                    location: detail,
                    message: fault.message,
                })),
            []
        );
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

    private cloneTest(test: Test, keepDetails: boolean = false): Test {
        return tap(
            {
                name: test.name,
                class: test.class,
                classname: test.classname,
                uri: test.uri,
                range: test.range,
                time: test.time,
                type: test.type,
            },
            (related: Test) =>
                when(test.fault, (fault: Fault) => {
                    related.fault = {
                        type: fault.type,
                        message: fault.message,
                    };

                    if (keepDetails === true) {
                        related.fault.details = fault.details;
                    }
                })
        );
    }

    private filterDetails(test: Test): Test {
        return tap(test, (test: Test) => {
            when(test.fault, (fault: Fault) => {
                const details: Detail[] = this.getDetails(fault);
                const current: Detail = when(details, (details: Detail[]) =>
                    details.find((detail: Detail) => this.isSameLine(detail, test))
                );

                when(current, (current: Detail) => {
                    test.uri = current.uri;
                    test.range = current.range;
                    fault.details = details.filter((detail: Detail) => this.isSameLine(detail, current));
                });
            });
        });
    }

    private isSameLine(source: Detail, target: Detail) {
        return source.uri === target.uri && target.range.start.line !== source.range.start.line;
    }

    private getDetails(fault: Fault | undefined): Detail[] {
        return fault && fault.details ? fault.details : [];
    }

    private asArray(item: any): any[] {
        return !item ? [] : item;
    }
}
