export class Configuration {
    private items = new Map<string, unknown>();

    constructor(items: Map<string, unknown> | { [p: string]: any } | undefined = undefined) {
        if (items instanceof Map) {
            this.items = items;
        } else if (!!items) {
            for (const x in items) {
                this.items.set(x, items[x]);
            }
        }
    }

    get(key: string, defaultValue?: unknown): unknown | undefined {
        return this.items.has(key) ? this.items.get(key) : defaultValue;
    }

    has(key: string) {
        return this.items.has(key);
    }

    async update(key: string, value: any) {
        this.items.set(key, value);
    }
}
