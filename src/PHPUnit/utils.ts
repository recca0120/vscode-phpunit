import { stat } from 'node:fs/promises';
import { Engine } from 'php-parser';
import * as yargsParser from 'yargs-parser';
import { Teamcity } from './types';

class EscapeValue {
    private values = {
        escape: ['||', '|\'', '|n', '|r', '|]', '|['],
        unescape: ['|', '\'', '\n', '\r', ']', '['],
    };

    private patterns: { unescape: RegExp[]; escape: RegExp[] };

    constructor() {
        this.patterns = {
            escape: this.toRegExp(this.values.escape),
            unescape: this.toRegExp(this.values.unescape),
        };
    }

    public escape(value: string | number | object) {
        return this.change(value, this.patterns.unescape, this.values.escape);
    }

    public unescape(value: string | number | object) {
        return this.change(value, this.patterns.escape, this.values.unescape);
    }

    public escapeSingleQuote(value: string | number | object) {
        return this.change(value, [new RegExp('\\|\'', 'g')], ['%%%SINGLE_QUOTE%%%']);
    }

    public unescapeSingleQuote(value: string | number | object) {
        return this.change(value, [new RegExp('%%%SINGLE_QUOTE%%%', 'g')], ['\'']);
    }

    private change(value: string | number | any, from: RegExp[], to: string[]) {
        if (typeof value === 'object') {
            for (const x in value) {
                value[x] = this.change(value[x], from, to);
            }

            return value;
        }

        if (typeof value !== 'string') {
            return value;
        }

        for (const x in from) {
            value = value.replace(from[x], to[x]);
        }

        return value;
    }

    private toRegExp(values: string[]) {
        return values.map((str) => {
            str = str.replace(/([|\]\[])/g, (m) => `\\${m}`);

            return new RegExp(str, 'g');
        });
    }
}

export const EOL = '\r\n';

export const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { extractDoc: true, suppressErrors: false },
    lexer: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        all_tokens: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        short_tags: true,
    },
});

export const escapeValue = new EscapeValue();

export const parseValue = (key: any, value: any): string[] => {
    if (Array.isArray(value)) {
        return value.reduce((acc: string[], item: any) => acc.concat(parseValue(key, item)), []);
    }
    const dash = key.length === 1 ? '-' : '--';
    const operator = key.length === 1 ? ' ' : '=';

    return [value === true ? `${dash}${key}` : `${dash}${key}${operator}${value}`];
};

export const groupBy = <T extends { [key: string]: any }>(items: T[], key: string): { [key: string]: T[]; } => {
    if (!items) {
        return {};
    }

    return items.reduce((acc, item: T) => {
        const itemKey = item[key] as string;

        if (!acc[itemKey]) {
            acc[itemKey] = [];
        }

        acc[itemKey].push(item);

        return acc;
    }, {} as { [key: string]: T[] });
};

export const parseTeamcity = (text: string): Teamcity => {
    text = text.trim().replace(new RegExp('^.*#+teamcity'), '').replace(/^\[|]$/g, '');
    text = escapeValue.escapeSingleQuote(text) as string;
    text = escapeValue.unescape(text) as string;

    const [eventName, ...args] = yargsParser(text)._;
    const command = [
        `--event='${eventName}'`,
        ...args.map((parameter) => `--${parameter}`),
    ];

    const { _, $0, ...argv } = yargsParser(command.join(' '), {
        string: ['actual', 'expected'],
    });

    return escapeValue.unescapeSingleQuote(argv);
};

export const parseArguments = (parameters: string[], excludes: string[]) => {
    const { _, ...argv } = yargsParser(parameters.join(' ').trim(), {
        alias: { configuration: ['c'] },
        configuration: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'camel-case-expansion': false,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'boolean-negation': false,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'short-option-groups': true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'dot-notation': false,
        },
    });

    return Object.entries(argv)
        .filter(([key]) => !excludes.includes(key))
        .reduce(
            (parameters: any, [key, value]) => [...parseValue(key, value), ...parameters],
            _.map((parameter) => (typeof parameter === 'number' ? parameter : decodeURIComponent(parameter))),
        ) as string[];
};

export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await stat(filePath);

        return true;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
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

    * [Symbol.iterator](): Generator<[K, V]> {
        for (const key of this.keys) {
            yield [key, this.weakMap.get(key)!];
        }
    }
}

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
export const uncapitalize = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
export const snakeCase = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s\-]+/g, '_').toLowerCase();
export const camelCase = (str: string) => str.toLowerCase().replace(/([-_ \s]+[a-z])/g, (group) => group.toUpperCase().replace(/[-_ \s]/g, ''));
export const titleCase = (str: string) => capitalize(str.replace(/([A-Z]+|[_\-\s]+([A-Z]+|[a-z]))/g, (_: string, matched: string) => {
    return ' ' + matched.trim().replace(/[_\-]/, '').toUpperCase();
}).trim());

export const cloneInstance = <T extends object>(obj: T): T => {
    const clone = Object.create(Object.getPrototypeOf(obj));

    return Object.assign(clone, obj);
};

