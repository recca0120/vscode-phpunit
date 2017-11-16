import { normalizePath, tap } from './helpers';

export class Collection {
    constructor(protected items: any[] = []) {}

    push(item: any) {
        this.items.push(item);

        return this;
    }

    put(items: any[]): Collection {
        this.items = this.items.concat(items);

        return this;
    }

    has(attribute): boolean {
        return this.items.some(this.createAttributeCallback(attribute));
    }

    where(attribute): Collection {
        return this.filter(this.createAttributeCallback(attribute));
    }

    first(): any {
        return this.items[0];
    }

    filter(callback: any): Collection {
        return new Collection(this.items.filter(callback));
    }

    map(callback: any): any[] {
        return this.items.map(callback);
    }

    forEach(callback: any) {
        this.items.forEach(callback);
    }

    each(callback: any) {
        this.forEach(callback);
    }

    reduce(callback, initialize) {
        return this.items.reduce(callback, initialize);
    }

    groupBy(attribute) {
        const callback =
            typeof attribute === 'string'
                ? (group, item) => {
                      group.set(
                          item[attribute],
                          tap(
                              group.has(item[attribute]) ? group.get(item[attribute]) : new Collection(),
                              collection => {
                                  collection.push(item);
                              }
                          )
                      );

                      return group;
                  }
                : attribute;

        return this.items.reduce(callback, new Map());
    }

    count(): number {
        return this.items.length;
    }

    all(): any[] {
        return this.items;
    }

    clear() {
        this.items = [];

        return this;
    }

    private createAttributeCallback(attribute) {
        return typeof attribute === 'string' ? (attribute = item => !!item[attribute]) : attribute;
    }
}

export class Store extends Collection {
    put(items: any[]): Collection {
        const files = items.map(item => normalizePath(item.file));
        this.items = this.items.filter(item => files.indexOf(normalizePath(item.file)) === -1).concat(items);

        return this;
    }

    has(path: string): boolean {
        return super.has(item => normalizePath(item.file) === normalizePath(path));
    }

    get(path: string): Collection {
        return this.where(item => normalizePath(item.file) === normalizePath(path));
    }

    getDetails(path: string) {
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
