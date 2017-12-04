import { Detail, Fault, TestCase } from 'phpunit-editor-support';

import { Collection } from './collection';
import { normalizePath } from './helpers';

export class Store extends Collection<TestCase> {
    constructor(tests: TestCase[] = []) {
        super();
        this.put(tests);
    }

    put(tests: TestCase[]): this {
        const files = tests.map(test => this.generateKey(test.file));
        this.items = this.items
            .filter((test: TestCase) => {
                return files.indexOf(this.generateKey(test.file)) === -1;
            })
            .concat(tests);

        return this;
    }

    has(path: string): boolean {
        return this.get(path).length > 0;
    }

    get(path: string): Collection<TestCase> {
        return this.where((item: TestCase) => {
            return this.generateKey(item.file) === this.generateKey(path);
        });
    }

    getDetails() {
        return this.reduce((results: any[], test: TestCase) => {
            results.push({
                key: this.generateKey(test.file),
                type: test.type,
                file: test.file,
                line: test.line,
                fault: {
                    message: test.fault ? test.fault.message : null,
                },
            });

            return !test.fault
                ? results
                : results.concat(
                      (test.fault.details as Detail[]).map((detail: Detail) => {
                          return {
                              key: this.generateKey(detail.file),
                              type: test.type,
                              file: detail.file,
                              line: detail.line,
                              fault: {
                                  message: (test.fault as Fault).message,
                              },
                          };
                      })
                  );
        }, []);
    }

    whereTestCase(path: string) {
        return this.where((test: TestCase) => {
            if (normalizePath(test.file) === normalizePath(path) || !test.fault) {
                return false;
            }

            return (test.fault.details as Detail[]).filter(
                (detail: Detail) => normalizePath(detail.file) === normalizePath(path)
            );
        });
    }

    dispose() {
        return this.clear();
    }

    private generateKey(path: string): string {
        return normalizePath(path);
    }
}
