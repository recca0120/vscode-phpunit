// Pest v3 bug: Str::beforeLast uses mb_strrpos (char offset) with substr (byte offset).
// The → character (U+2192) is 3 UTF-8 bytes but 1 char, so names are truncated
// by 2 bytes per → character.
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
