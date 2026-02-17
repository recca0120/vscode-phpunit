import yargsParser from 'yargs-parser';
import type { Teamcity } from '../types';

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

export const escapeValue = new EscapeValue();

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
