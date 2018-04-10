import { Test, Assertion, Detail, Fault } from './phpunit';
import { FilesystemContract, Filesystem } from './filesystem';
import { groupBy } from './helpers';

export class Collection {
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

    getAssertions(): Map<string, Assertion[]> {
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
