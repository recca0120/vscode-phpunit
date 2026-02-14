export class CustomWeakMap<K extends object, V> {
    private weakMap: WeakMap<K, V>;
    private keys: Set<K>;

    constructor() {
        this.weakMap = new WeakMap<K, V>();
        this.keys = new Set<K>();
    }

    clear() {
        this.weakMap = new WeakMap();
        this.keys = new Set();
    }

    delete(key: K) {
        this.keys.delete(key);

        return this.weakMap.delete(key);
    }

    get(key: K) {
        return this.weakMap.get(key);
    }

    has(key: K) {
        return this.keys.has(key);
    }

    set(key: K, value: V) {
        this.keys.add(key);
        this.weakMap.set(key, value);

        return this;
    }

    forEach(callback: (value: V, key: K) => void) {
        this.keys.forEach((key) => {
            callback(this.weakMap.get(key)!, key);
        });
    }

    *[Symbol.iterator](): Generator<[K, V]> {
        for (const key of this.keys) {
            yield [key, this.weakMap.get(key)!];
        }
    }
}
