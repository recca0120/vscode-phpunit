import { Collection } from './collection';
import { normalizePath } from './helpers';

export class Store extends Collection {
    put(items: any[]): Collection {
        const files = items.map(item => normalizePath(item.file));
        this.items = this.items.filter(item => files.indexOf(normalizePath(item.file)) === -1).concat(items);

        return this;
    }

    has(path: string): boolean {
        return super.has('file', path);
    }

    get(path: string): Collection {
        return this.where(item => normalizePath(item.file) === normalizePath(path));
    }

    getDetails() {
        return this.reduce((results, item) => {
            results.push({
                key: normalizePath(item.file),
                type: item.type,
                file: item.file,
                line: item.line,
                message: item.fault.message,
            });

            return !item.fault
                ? results
                : results.concat(
                      item.fault.details.map(detail => {
                          return {
                              key: normalizePath(detail.file),
                              type: item.type,
                              file: detail.file,
                              line: detail.line,
                              message: item.fault.message,
                          };
                      })
                  );
        }, []);
    }

    filterDetails(path: string) {
        return this.filter(item => {
            if (normalizePath(item.file) === normalizePath(path) || !item.fault) {
                return false;
            }

            return item.fault.details.filter(detail => normalizePath(detail.file) === normalizePath(path));
        });
    }

    dispose() {
        return this.clear();
    }
}
