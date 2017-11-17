import { Collection } from './collection';
import { Message } from '_debugger';
import { TestCase } from './parsers/parser';
import { normalizePath } from './helpers';

export class Store extends Collection<TestCase> {
    constructor(items: TestCase[] = []) {
        super();
        this.put(items);
    }

    put(items: TestCase[]): this {
        const files = items.map(item => this.generateKey(item.file));
        this.items = this.items
            .filter((item: TestCase) => {
                return files.indexOf(this.generateKey(item.file)) === -1;
            })
            .concat(items);

        return this;
    }

    has(path: string): boolean {
        return this.get(path).length > 0;
    }

    get(path: string): Collection<TestCase> {
        return this.where(item => {
            return this.generateKey(item.file) === this.generateKey(path);
        });
    }

    getDetails() {
        return this.reduce((results, item) => {
            results.push({
                key: this.generateKey(item.file),
                type: item.type,
                file: item.file,
                line: item.line,
                fault: {
                    message: item.fault ? item.fault.message : null,
                },
            });

            return !item.fault
                ? results
                : results.concat(
                      item.fault.details.map(detail => {
                          return {
                              key: this.generateKey(detail.file),
                              type: item.type,
                              file: detail.file,
                              line: detail.line,
                              fault: {
                                  message: item.fault.message,
                              },
                          };
                      })
                  );
        }, []);
    }

    whereTestCase(path: string) {
        return this.where(item => {
            if (normalizePath(item.file) === normalizePath(path) || !item.fault) {
                return false;
            }

            return item.fault.details.filter(detail => normalizePath(detail.file) === normalizePath(path));
        });
    }

    dispose() {
        return this.clear();
    }

    private generateKey(path): string {
        return normalizePath(path);
    }
}
