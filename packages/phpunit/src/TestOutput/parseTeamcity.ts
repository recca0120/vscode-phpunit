import type { Teamcity } from '../types';

const unescapeMap: Record<string, string> = {
    '||': '|',
    "|'": "'",
    '|n': '\n',
    '|r': '\r',
    '|]': ']',
    '|[': '[',
};

const unescapePattern = /\|[|'nr[\]]/g;

function teamcityUnescape(value: string): string {
    return value.replace(unescapePattern, (match) => unescapeMap[match] ?? match);
}

function parseNumber(value: string): string | number {
    const num = Number(value);

    return Number.isFinite(num) && String(num) === value ? num : value;
}

const keyValuePattern = /(\w+)='((?:[^']|(?<=\|)')*)'/g;

export const parseTeamcity = (text: string): Teamcity => {
    const body = text
        .trim()
        .replace(/^.*#+teamcity\[/, '')
        .replace(/]$/, '');

    const spaceIndex = body.indexOf(' ');
    const result: Record<string, string | number> = {
        event: spaceIndex === -1 ? body : body.substring(0, spaceIndex),
    };

    for (const [, key, value] of body.substring(spaceIndex + 1).matchAll(keyValuePattern)) {
        const raw = teamcityUnescape(value);
        result[key] = key === 'actual' || key === 'expected' ? raw : parseNumber(raw);
    }

    return result as Teamcity;
};
