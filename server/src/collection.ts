import { Test } from './phpunit';
import { FilesystemContract, files as fileSystem } from './filesystem';

export class Collection {
    private items: Map<string, Test[]> = new Map<string, Test[]>();

    constructor(private files: FilesystemContract = fileSystem) {}

    set(tests: Test[]): Collection {
        const groups: Map<string, Test[]> = this.groupBy(tests);

        for (const key of groups.keys()) {
            // console.log(this.items.get(key))
            this.items.set(key, this.merge(this.items.get(key) || [], groups.get(key)));
        }

        return this;
    }

    get(file: string): Test[] {
        return this.items.get(this.normalizePath(file)) || [];
    }

    private groupBy(tests: Test[]): Map<string, Test[]> {
        return tests.reduce((groups: Map<string, Test[]>, test: Test) => {
            const key: string = this.normalizePath(test.file);
            const group: Test[] = groups.get(key) || [];
            group.push(test);
            groups.set(key, group);

            return groups;
        }, new Map<string, Test[]>());
    }

    private merge(oldTests: Test[], newTests: Test[]): Test[] {
        const merged: Test[] = oldTests
            .filter((oldTest: Test) => {
                for (const newTest of newTests) {
                    if (oldTest.file === newTest.file && oldTest.name === newTest.name) {
                        return false;
                    }
                }

                return true;
            })
            .concat(newTests);

        merged.sort((a: Test, b: Test) => {
            return a.line > b.line ? 1 : -1;
        });

        return merged;
    }

    private normalizePath(path: string): string {
        return this.files.normalizePath(path).toLowerCase();
    }
}
