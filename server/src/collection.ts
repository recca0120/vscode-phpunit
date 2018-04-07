import { Test } from './phpunit';

export class Collection {
    private items: Map<string, Test[]> = new Map<string, Test[]>();

    set(tests: Test[]): Collection {
        const groups: Map<string, Test[]> = this.groupBy(tests);

        for (const key of groups.keys()) {
            // console.log(this.items.get(key))
            this.items.set(key, this.merge(this.items.get(key) || [], groups.get(key)));
        }

        return this;
    }

    get(file: string): Test[] {
        return this.items.get(file) || [];
    }

    private groupBy(tests: Test[]): Map<string, Test[]> {
        return tests.reduce((groups: Map<string, Test[]>, test: Test) => {
            const group: Test[] = groups.get(test.file) || [];
            group.push(test);
            groups.set(test.file, group);

            return groups;
        }, new Map<string, Test[]>());
    }

    private merge(oldTests: Test[], newTests: Test[]) {
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
}
