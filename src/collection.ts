import { tap } from './helpers';

export class Collection {
    constructor(protected items: any[] = []) {}

    concat(items: any[]): Collection {
        return new Collection(this.items.concat(items));
    }

    push(item: any) {
        this.items.push(item);

        return this;
    }

    put(items: any[]): Collection {
        this.items = this.items.concat(items);

        return this;
    }

    has(key, value?): boolean {
        return this.items.some(this.createFilterCallback(key, value));
    }

    where(key, value?): Collection {
        return this.filter(this.createFilterCallback(key, value));
    }

    first(): any {
        return this.items[0] || null;
    }

    filter(callback: any): Collection {
        return new Collection(this.items.filter(callback));
    }

    map(callback: any): Collection {
        return new Collection(this.items.map(callback));
    }

    reduce(callback, initialize): Collection {
        return new Collection(this.items.reduce(callback, initialize));
    }

    forEach(callback: any) {
        this.items.forEach(callback);
    }

    groupBy(attribute) {
        const callback =
            typeof attribute === 'string'
                ? (group, item) =>
                      tap(group, group => {
                          group.set(
                              item[attribute],
                              tap(
                                  group.has(item[attribute]) ? group.get(item[attribute]) : new Collection(),
                                  collection => collection.push(item)
                              )
                          );
                      })
                : attribute;

        return this.items.reduce(callback, new Map());
    }

    count(): number {
        return this.items.length;
    }

    values(): any[] {
        return this.items;
    }

    all(): any[] {
        return this.values();
    }

    clear() {
        this.items = [];

        return this;
    }

    get length() {
        return this.count();
    }

    protected createFilterCallback(key, value?: any) {
        return typeof key === 'string'
            ? item => {
                  if (!value) {
                      return !!item[key];
                  }

                  return !!item[key] && item[key] === value;
              }
            : key;
    }
}
