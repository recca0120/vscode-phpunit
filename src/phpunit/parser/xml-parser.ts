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

function getValue(node: any, key: any, defaultValue?: any) {
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

interface TestSuite {
    type: string;
    name: string;
    value: string;
}

class Parser {
    constructor(private root: any) {
    }

    getTestSuites() {
        const callback = (tagName: string, node: any, parent: any) => {
            const name = getAttribute(parent, 'name') as string;

            return { tagName, name, value: getValue(node, tagName) };
        };

        return this.getDirectoriesAndFiles('phpunit.testsuites.testsuite', {
            'directory': callback,
            'file': callback,
        });
    }

    getIncludes() {
        return this.getIncludesOrExcludes('phpunit.source.include');
    }

    getExcludes() {
        return this.getIncludesOrExcludes('phpunit.source.exclude');
    }

    private getIncludesOrExcludes(key: string) {
        return this.getDirectoriesAndFiles(key, {
            'directory': (tagName: string, node: any) => {
                const prefix = getAttribute(node, 'prefix');
                const suffix = getAttribute(node, 'suffix');

                return { tagName, prefix, suffix, value: getValue(node, tagName) };
            },
            'file': (tagName: string, node: any) => {
                return { tagName, value: getValue(node, tagName) };
            },
        });
    }

    get(key: string, defaultValue: any = undefined) {
        return get(this.root, key, defaultValue);
    }

    private getDirectoriesAndFiles(key: string, callbacks: {
        [propName: string]: (tagName: string, node: any, parent: any) => any
    }) {
        return ensureArray(this.get(key)).reduce((results: TestSuite[], parent: any) => {
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