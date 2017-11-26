import { tap } from './helpers';

export class Collection<T> {
    constructor(protected items: T[] = []) {}

    concat(items: T[]): Collection<T> {
        return new Collection(this.items.concat(items));
    }

    push(item: T): this {
        this.items.push(item);

        return this;
    }

    put(items: T[]): this {
        this.items = this.items.concat(items);

        return this;
    }

    has(key: any, value?: any): boolean {
        return this.items.some(this.createFilterCallback(key, value));
    }

    where(key: any, value?: any): Collection<T> {
        return this.filter(this.createFilterCallback(key, value));
    }

    first(): T {
        return this.items[0] || null;
    }

    filter(callback: any): Collection<T> {
        return new Collection(this.items.filter(callback));
    }

    map(callback: any): Collection<T> {
        return new Collection(this.items.map(callback));
    }

    reduce(callback: any, initialize: T[]): Collection<T> {
        return new Collection(this.items.reduce(callback, initialize));
    }

    forEach(callback: any) {
        this.items.forEach(callback);
    }

    groupBy(attribute: any) {
        const callback =
            typeof attribute === 'string'
                ? (group: any, item: any) =>
                      tap(group, (group: any) => {
                          group.set(
                              item[attribute],
                              tap(
                                  group.has(item[attribute]) ? group.get(item[attribute]) : new Collection(),
                                  (collection: Collection<T>) => collection.push(item)
                              )
                          );
                      })
                : attribute;

        return this.items.reduce(callback, new Map());
    }

    count(): number {
        return this.items.length;
    }

    values(): T[] {
        return this.items;
    }

    all(): T[] {
        return this.values();
    }

    clear(): Collection<T> {
        this.items = [];

        return this;
    }

    get length(): number {
        return this.count();
    }

    protected createFilterCallback(key: any, value?: any) {
        return typeof key === 'string'
            ? (item: any) => {
                  if (!value) {
                      return !!item[key];
                  }

                  return !!item[key] && item[key] === value;
              }
            : key;
    }
}
