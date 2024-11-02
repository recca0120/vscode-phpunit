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
        return ensureArray(this.get('phpunit.testsuites.testsuite'))
            .reduce((results: TestSuite[], node: any) => {
                const name: string = getAttribute(node, 'name');
                ['directory', 'file'].forEach((type) => {
                    const temp = ensureArray(node[type] ?? []).map((node) => ({
                        type, name, value: getValue(node, type),
                    }));

                    if (temp) {
                        results.push(...temp);
                    }
                });

                return results;
            }, []);
    }

    getSources() {
        return ensureArray(this.get('phpunit.source.include'))
            .reduce((results: any, node: any) => {
                ['directory', 'file'].forEach((type) => {
                    const temp = ensureArray(ensureArray(node[type] ?? [])).map((node) => {
                        if (type === 'directory') {
                            const prefix = getAttribute(node, 'prefix');
                            const suffix = getAttribute(node, 'suffix');
                            return { type, prefix, suffix, value: getValue(node, type) };
                        } else {
                            return { type, value: getValue(node, type) };
                        }
                    });

                    if (temp) {
                        results.push(...temp);
                    }
                });

                return results;
            }, []);
    }

    get(key: string, defaultValue: any = undefined) {
        return get(this.root, key, defaultValue);
    }
}

export const parse = (text: string) => {
    const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

    return new Parser(parser.parse(text));
};