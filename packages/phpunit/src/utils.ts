import { access } from 'node:fs/promises';

export const EOL = '\r\n';

const aliases: Record<string, string> = { c: 'configuration' };

export function stripQuotes(s: string): string {
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
        return s.slice(1, -1);
    }
    return s;
}

const TOKEN_PATTERN = /(?:[^\s"']+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+/g;

function tokenize(input: string): string[] {
    return [...input.matchAll(TOKEN_PATTERN)].map((m) => m[0]);
}

export function parseArgv(input: string): string[] {
    return tokenize(input).map(stripQuotes);
}

interface ParsedOption {
    index: number;
    option?: string;
}

export function parseArguments(parameters: string[], excludes: string[]): string[] {
    const tokens = tokenize(parameters.join(' ').trim());
    const nextValue = (i: number) =>
        i + 1 < tokens.length && !stripQuotes(tokens[i + 1]).startsWith('-')
            ? stripQuotes(tokens[i + 1])
            : undefined;

    const options: string[] = [];
    const positionals: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = stripQuotes(tokens[i]);

        let parsed: ParsedOption;
        if (token.startsWith('--')) {
            parsed = parseLongOption(token, i, excludes, nextValue(i));
        } else if (token.startsWith('-') && token.length === 2) {
            parsed = parseShortOption(token, i, excludes, nextValue(i));
        } else {
            positionals.push(decodeURIComponent(token));
            continue;
        }

        i = parsed.index;
        if (parsed.option) {
            options.push(parsed.option);
        }
    }

    return [...options, ...positionals];
}

function parseLongOption(
    token: string,
    i: number,
    excludes: string[],
    nextVal: string | undefined,
): ParsedOption {
    const eqIndex = token.indexOf('=');
    const key = eqIndex !== -1 ? token.substring(2, eqIndex) : token.substring(2);

    if (excludes.includes(key)) {
        return { index: eqIndex === -1 && nextVal !== undefined ? i + 1 : i };
    }

    if (eqIndex !== -1) {
        return { index: i, option: `--${key}=${stripQuotes(token.substring(eqIndex + 1))}` };
    }
    if (nextVal === undefined) {
        return { index: i, option: token };
    }
    return { index: i + 1, option: `--${key}=${nextVal}` };
}

function parseShortOption(
    token: string,
    i: number,
    excludes: string[],
    nextVal: string | undefined,
): ParsedOption {
    const short = token[1];
    const longKey = aliases[short];
    const key = longKey ?? short;

    if (excludes.includes(key)) {
        return { index: nextVal !== undefined ? i + 1 : i };
    }

    if (nextVal === undefined) {
        return { index: i, option: longKey ? `--${longKey}` : token };
    }
    return {
        index: i + 1,
        option: longKey ? `--${longKey}=${nextVal}` : `-${short} ${nextVal}`,
    };
}

export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
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

export const splitFQN = (fqn: string): { namespace: string; className: string } => {
    const parts = fqn.split('\\');
    const className = parts.pop() ?? '';
    return { namespace: parts.join('\\'), className };
};

export const cloneInstance = <T extends object>(obj: T): T =>
    Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);

function semverCompare(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

export const semverGte = (a: string, b: string) => semverCompare(a, b) >= 0;
export const semverLt = (a: string, b: string) => semverCompare(a, b) < 0;

export const datasetNamed = (key: string) => `data set "${key}"`;
export const datasetIndexed = (index: number | string) => `data set #${index}`;

const DATASET_PATTERN =
    /^(?<base>.*?)(?<dataset>\swith\s(?<label>data\sset\s[#"(].+|dataset\s".+|\(.+))$/;

export function normalizePestLabel(label: string): string {
    const match = label.match(/^data set "(.+)"$/);
    if (!match) {
        return label;
    }
    const inner = match[1];
    if (inner.startsWith('dataset ') || inner.startsWith('(')) {
        return inner;
    }
    return label;
}

export function parseDataset(id: string): { parentId: string; dataset: string; label: string } {
    const match = id.match(DATASET_PATTERN);
    if (!match?.groups) {
        return { parentId: id, dataset: '', label: '' };
    }
    const label = normalizePestLabel(match.groups.label);
    return {
        parentId: match.groups.base,
        dataset: match.groups.dataset,
        label,
    };
}
