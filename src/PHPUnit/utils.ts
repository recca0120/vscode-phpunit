import { stat } from 'node:fs/promises';
import { Engine } from 'php-parser';
import yargsParser from 'yargs-parser';

export { escapeValue, parseTeamcity } from './ProblemMatcher/parseTeamcity';

export const EOL = '\r\n';

export const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { extractDoc: true, suppressErrors: false },
    lexer: {
        all_tokens: true,
        short_tags: true,
    },
});

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

    const positionals = _.map((parameter) =>
        typeof parameter === 'number' ? String(parameter) : decodeURIComponent(parameter),
    );

    const entries = Object.entries(argv).filter(([key]) => !excludes.includes(key));
    const options: string[] = [];
    for (const [key, value] of entries.reverse()) {
        options.push(...parseValue(key, value as string | boolean | string[]));
    }

    return [...options, ...positionals];
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
