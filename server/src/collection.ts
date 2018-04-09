import { Test } from './phpunit';
import { FilesystemContract, Filesystem } from './filesystem';

export class Collection {
    private items: Map<string, Test[]> = new Map<string, Test[]>();

    constructor(private files: FilesystemContract = new Filesystem()) {}

    put(tests: Test[]): Collection {
        const groups: Map<string, Test[]> = this.groupBy(tests);

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

    private groupBy(tests: Test[]): Map<string, Test[]> {
        return tests.reduce((groups: Map<string, Test[]>, test: Test) => {
            const group: Test[] = groups.get(test.uri) || [];
            group.push(test);
            groups.set(test.uri, group);

            return groups;
        }, new Map<string, Test[]>());
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
