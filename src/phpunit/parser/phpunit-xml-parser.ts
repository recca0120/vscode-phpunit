import { XMLParser } from 'fast-xml-parser';

function get(node: any, key: string, defaultValue: any) {
    const segments = key.split('.');
    let current = node;
    while (segments.length > 0) {
        const segment = segments.shift()!;
        current = current[segment] ?? undefined;

        if (current === undefined) {
            return defaultValue;
        }
    }

    return current;
}

function getAttribute(node: any, key: any, defaultValue?: any) {
    const symbol = '@';

    return node[`${symbol}_${key}`] ?? defaultValue;
}

function getText(node: any, key: any, defaultValue?: any) {
    if (typeof node === 'string') {
        return node;
    }

    if (node.hasOwnProperty(key)) {
        return node[key];
    }

    if (node.hasOwnProperty('#text')) {
        return node['#text'];
    }

    return defaultValue;
}

function ensureArray(obj: any) {
    return Array.isArray(obj) ? obj : [obj];
}

type TestSuite = {
    tagName: string;
    name: string;
    value: string;
}

type Include = {
    tagName: string;
    value: string;
    prefix?: string;
    suffix?: string;
}

type Exclude = Include
type IncludeOrExclude = Include | Exclude


class Parser {
    constructor(private root: any) {
    }

    getTestSuites() {
        const callback = (tagName: string, node: any, parent: any) => {
            const name = getAttribute(parent, 'name') as string;

            return { tagName, name, value: getText(node, tagName) };
        };

        return this.getDirectoriesAndFiles<TestSuite>('phpunit.testsuites.testsuite', {
            'directory': callback,
            'file': callback,
        });
    }

    getIncludes(): Include[] {
        return this.getIncludesOrExcludes('phpunit.source.include');
    }

    getExcludes(): Exclude[] {
        return this.getIncludesOrExcludes('phpunit.source.exclude');
    }

    getSources() {
        const appendType = (type: string, objs: IncludeOrExclude[]) => objs.map(obj => ({ type, ...obj }));

        return [
            ...appendType('include', this.getIncludes()),
            ...appendType('exclude', this.getExcludes()),
        ];
    }

    private getIncludesOrExcludes(key: string): IncludeOrExclude[] {
        return this.getDirectoriesAndFiles<IncludeOrExclude>(key, {
            'directory': (tagName: string, node: any) => {
                const prefix = getAttribute(node, 'prefix');
                const suffix = getAttribute(node, 'suffix');

                return { tagName, value: getText(node, tagName), prefix, suffix };
            },
            'file': (tagName: string, node: any) => {
                return { tagName, value: getText(node, tagName) };
            },
        });
    }

    get(key: string, defaultValue: any = undefined) {
        return get(this.root, key, defaultValue);
    }

    private getDirectoriesAndFiles<T>(key: string, callbacks: {
        [propName: string]: (tagName: string, node: any, parent: any) => T
    }) {
        return ensureArray(this.get(key)).reduce((results: T[], parent: any) => {
            for (const [type, callback] of Object.entries(callbacks)) {
                const temp = ensureArray(parent[type] ?? []).map((node) => callback(type, node, parent));

                if (temp) {
                    results.push(...temp);
                }
            }

            return results;
        }, []);
    }
}

export const parse = (text: string) => {
    const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

    return new Parser(parser.parse(text));
};