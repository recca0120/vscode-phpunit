import { stat } from 'node:fs/promises';

export const EOL = '\r\n';

const aliases: Record<string, string> = { c: 'configuration' };

function stripQuotes(s: string): string {
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
        return s.slice(1, -1);
    }
    return s;
}

function nextIsOption(token: string): boolean {
    const stripped = stripQuotes(token);
    return stripped.startsWith('-');
}

export const parseArguments = (parameters: string[], excludes: string[]): string[] => {
    const input = parameters.join(' ').trim();
    const tokens = [...input.matchAll(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)].map((m) => m[0]);

    const options: string[] = [];
    const positionals: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = stripQuotes(tokens[i]);

        // long option: --key=value or --key value or --flag
        if (token.startsWith('--')) {
            const eqIndex = token.indexOf('=');
            if (eqIndex !== -1) {
                const key = token.substring(2, eqIndex);
                if (!excludes.includes(key)) {
                    options.push(token);
                }
                continue;
            }
            const key = token.substring(2);
            if (excludes.includes(key)) {
                if (i + 1 < tokens.length && !nextIsOption(tokens[i + 1])) {
                    i++;
                }
                continue;
            }
            if (i + 1 < tokens.length && !nextIsOption(tokens[i + 1])) {
                options.push(`--${key}=${stripQuotes(tokens[++i])}`);
            } else {
                options.push(token);
            }
            continue;
        }

        // short option: -x value or -x
        if (token.startsWith('-') && token.length === 2) {
            const short = token[1];
            const longKey = aliases[short];
            const key = longKey ?? short;
            if (excludes.includes(key)) {
                if (i + 1 < tokens.length && !nextIsOption(tokens[i + 1])) {
                    i++;
                }
                continue;
            }
            if (i + 1 < tokens.length && !nextIsOption(tokens[i + 1])) {
                const value = stripQuotes(tokens[++i]);
                options.push(longKey ? `--${longKey}=${value}` : `-${short} ${value}`);
            } else {
                options.push(longKey ? `--${longKey}` : token);
            }
            continue;
        }

        // positional
        positionals.push(decodeURIComponent(token));
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
        }
        throw error;
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

export const cloneInstance = <T extends object>(obj: T): T => {
    const clone = Object.create(Object.getPrototypeOf(obj));

    return Object.assign(clone, obj);
};
