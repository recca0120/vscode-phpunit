import { stat } from 'node:fs/promises';
import { Engine } from 'php-parser';
import yargsParser from 'yargs-parser';
import type { Teamcity } from './types';

class EscapeValue {
    private readonly mappings: ReadonlyArray<readonly [string, string]> = [
        ['||', '|'],
        ["|'", "'"],
        ['|n', '\n'],
        ['|r', '\r'],
        ['|]', ']'],
        ['|[', '['],
    ];

    private readonly escapePatterns: ReadonlyArray<readonly [RegExp, string]>;
    private readonly unescapePatterns: ReadonlyArray<readonly [RegExp, string]>;

    constructor() {
        this.escapePatterns = this.mappings.map(
            ([escaped, unescaped]) => [this.toRegExp(unescaped), escaped] as const,
        );
        this.unescapePatterns = this.mappings.map(
            ([escaped, unescaped]) => [this.toRegExp(escaped), unescaped] as const,
        );
    }

    public escape(value: string | number | object) {
        return this.change(value, this.escapePatterns);
    }

    public unescape(value: string | number | object) {
        return this.change(value, this.unescapePatterns);
    }

    public escapeSingleQuote(value: string | number | object) {
        return this.change(value, [[/\|'/g, '%%%SINGLE_QUOTE%%%']]);
    }

    public unescapeSingleQuote(value: string | number | object) {
        return this.change(value, [[/%%%SINGLE_QUOTE%%%/g, "'"]]);
    }

    private change(
        value: string | number | object,
        replacements: ReadonlyArray<readonly [RegExp, string]>,
    ) {
        if (typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            for (const x in obj) {
                obj[x] = this.change(obj[x] as string | number | object, replacements);
            }

            return obj;
        }

        if (typeof value !== 'string') {
            return value;
        }

        for (const [pattern, replacement] of replacements) {
            value = value.replace(pattern, replacement);
        }

        return value;
    }

    private toRegExp(str: string) {
        return new RegExp(
            str.replace(/([|\][])/g, (m) => `\\${m}`),
            'g',
        );
    }
}

export const EOL = '\r\n';

export const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { extractDoc: true, suppressErrors: false },
    lexer: {
        all_tokens: true,
        short_tags: true,
    },
});

export const escapeValue = new EscapeValue();

export const parseValue = (key: string, value: string | boolean | string[]): string[] => {
    if (Array.isArray(value)) {
        return value.reduce(
            (acc: string[], item: string | boolean | string[]) => acc.concat(parseValue(key, item)),
            [],
        );
    }
    const dash = key.length === 1 ? '-' : '--';
    const operator = key.length === 1 ? ' ' : '=';

    return [value === true ? `${dash}${key}` : `${dash}${key}${operator}${value}`];
};

export const groupBy = <T extends Record<string, unknown>>(
    items: T[],
    key: string,
): { [key: string]: T[] } => {
    if (!items) {
        return {};
    }

    return items.reduce(
        (acc, item: T) => {
            const itemKey = item[key] as string;

            if (!acc[itemKey]) {
                acc[itemKey] = [];
            }

            acc[itemKey].push(item);

            return acc;
        },
        {} as { [key: string]: T[] },
    );
};

export const parseTeamcity = (text: string): Teamcity => {
    text = text
        .trim()
        .replace(/^.*#+teamcity/, '')
        .replace(/^\[|]$/g, '');
    text = escapeValue.escapeSingleQuote(text) as string;
    text = escapeValue.unescape(text) as string;

    const [eventName, ...args] = yargsParser(text)._;
    const command = [`--event='${eventName}'`, ...args.map((parameter) => `--${parameter}`)];

    const { _, $0, ...argv } = yargsParser(command.join(' '), {
        string: ['actual', 'expected'],
    });

    return escapeValue.unescapeSingleQuote(argv) as Teamcity;
};

export const parseArguments = (parameters: string[], excludes: string[]) => {
    const { _, ...argv } = yargsParser(parameters.join(' ').trim(), {
        alias: { configuration: ['c'] },
        configuration: {
            'camel-case-expansion': false,
            'boolean-negation': false,
            'short-option-groups': true,
            'dot-notation': false,
        },
    });

    return Object.entries(argv)
        .filter(([key]) => !excludes.includes(key))
        .reduce(
            (parameters: string[], [key, value]) => [
                ...parseValue(key, value as string | boolean | string[]),
                ...parameters,
            ],
            _.map((parameter) =>
                typeof parameter === 'number' ? String(parameter) : decodeURIComponent(parameter),
            ),
        );
};

export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await stat(filePath);

        return true;
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
            return false;
        } else {
            throw error;
        }
    }
}

export async function findAsyncSequential<T>(
    array: T[],
    predicate: (t: T) => Promise<boolean>,
): Promise<T | undefined> {
    for (const t of array) {
        if (await predicate(t)) {
            return t;
        }
    }
    return undefined;
}

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

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
export const uncapitalize = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
export const snakeCase = (str: string) =>
    str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
export const camelCase = (str: string) =>
    str
        .toLowerCase()
        .replace(/([-_ \s]+[a-z])/g, (group) => group.toUpperCase().replace(/[-_ \s]/g, ''));
export const titleCase = (str: string) =>
    capitalize(
        str
            .replace(/([A-Z]+|[_\-\s]+([A-Z]+|[a-z]))/g, (_: string, matched: string) => {
                return ` ${matched.trim().replace(/[_-]/, '').toUpperCase()}`;
            })
            .trim(),
    );

export const cloneInstance = <T extends object>(obj: T): T => {
    const clone = Object.create(Object.getPrototypeOf(obj));

    return Object.assign(clone, obj);
};
