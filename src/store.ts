import { Collection } from './collection';
import { normalizePath } from './helpers';

export class Store extends Collection {
    constructor(items: any[] = []) {
        super();
        this.put(items);
    }

    put(items: any[]): Collection {
        const files = items.map(item => this.generateKey(item.file));
        this.items = this.items.filter(item => files.indexOf(this.generateKey(item.file)) === -1).concat(items);

        return this;
    }

    has(path: string): boolean {
        return this.get(path).length > 0;
    }

    get(path: string): Collection {
        return this.where(item => this.generateKey(item.file) === this.generateKey(path));
    }

    getDetails() {
        return this.reduce((results, item) => {
            results.push({
                key: this.generateKey(item.file),
                type: item.type,
                file: item.file,
                line: item.line,
                message: item.fault ? item.fault.message : null,
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
                              message: item.fault.message,
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

    private generateKey(path) {
        return normalizePath(path);
    }
}
