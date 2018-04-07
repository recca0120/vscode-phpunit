import { Test } from './phpunit';
import Uri from 'vscode-uri'

export class Collection {
    private items: Map<string, Test[]> = new Map<string, Test[]>();

    set(tests: Test[]): Collection {
        const groups: Map<string, Test[]> = this.groupBy(tests);

        for (const key of groups.keys()) {
            this.items.set(key, this.merge(this.items.get(key) || [], groups.get(key)));
        }

        return this;
    }

    get(uri: string): Test[] {
        return this.items.get(this.toUri(uri)) || [];
    }

    private groupBy(tests: Test[]): Map<string, Test[]> {
        return tests.reduce((groups: Map<string, Test[]>, test: Test) => {
            const uri: string = this.toUri(test.file);
            const group: Test[] = groups.get(uri) || [];
            group.push(test);
            groups.set(uri, group);

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

    private toUri(path: string): string {
        return this.isUri(path) === true ? path : Uri.file(path).toString();
    }

    private isUri(uri: string): boolean {
        return /^file:\/\//.test(uri);
    }
}
