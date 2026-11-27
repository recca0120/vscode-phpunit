export class AliasMap<T> extends Map<string, T> {
    override set(id: string, item: T): this {
        super.set(id, item);
        const count = id.match(/\u2192/g)?.length ?? 0;
        if (count > 0) {
            super.set(id.slice(0, -count * 2), item);
        }

        return this;
    }
}
