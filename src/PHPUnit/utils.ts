import { access } from 'node:fs/promises';

export const EOL = '\r\n';

const aliases: Record<string, string> = { c: 'configuration' };

export function stripQuotes(s: string): string {
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
        return s.slice(1, -1);
    }
    return s;
}

export function parseArgv(input: string): string[] {
    return [...input.matchAll(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)].map((m) => stripQuotes(m[0]));
}

export const parseArguments = (parameters: string[], excludes: string[]): string[] => {
    const tokens = [
        ...parameters
            .join(' ')
            .trim()
            .matchAll(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g),
    ].map((m) => m[0]);

    const hasValue = (i: number) =>
        i + 1 < tokens.length && !stripQuotes(tokens[i + 1]).startsWith('-');

    const options: string[] = [];
    const positionals: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = stripQuotes(tokens[i]);

        // long option: --key=value or --key value or --flag
        if (token.startsWith('--')) {
            const eqIndex = token.indexOf('=');
            const key = eqIndex !== -1 ? token.substring(2, eqIndex) : token.substring(2);
            if (excludes.includes(key)) {
                if (eqIndex === -1 && hasValue(i)) i++;
                continue;
            }
            if (eqIndex !== -1) {
                options.push(`--${key}=${stripQuotes(token.substring(eqIndex + 1))}`);
            } else if (!hasValue(i)) {
                options.push(token);
            } else {
                options.push(`--${key}=${stripQuotes(tokens[++i])}`);
            }
            continue;
        }

        // short option: -x value or -x
        if (token.startsWith('-') && token.length === 2) {
            const short = token[1];
            const longKey = aliases[short];
            const key = longKey ?? short;
            if (excludes.includes(key)) {
                if (hasValue(i)) i++;
                continue;
            }
            if (!hasValue(i)) {
                options.push(longKey ? `--${longKey}` : token);
            } else {
                const value = stripQuotes(tokens[++i]);
                options.push(longKey ? `--${longKey}=${value}` : `-${short} ${value}`);
            }
            continue;
        }

        // positional
        positionals.push(decodeURIComponent(token));
    }

    return [...options, ...positionals];
};

export async function checkFileExists(filePath: string): Promise<boolean> {
    return access(filePath).then(
        () => true,
        () => false,
    );
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
