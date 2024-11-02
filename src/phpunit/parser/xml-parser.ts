import { XMLParser } from 'fast-xml-parser';

function get(obj: any, key: string, defaultValue: any) {
    const segments = key.split('.');
    let current = obj;
    while (segments.length > 0) {
        const segment = segments.shift()!;
        current = current[segment] ?? undefined;

        if (current === undefined) {
            return defaultValue;
        }
    }

    return current;
}

function getAttribute(obj: any, key: any, defaultValue?: any) {
    const symbol = '@';

    return obj[`${symbol}_${key}`] ?? defaultValue;
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
            .reduce((testsuites: TestSuite[], node: any) => {
                const name: string = getAttribute(node, 'name');
                ['directory', 'file'].forEach((type) => {
                    const result = ensureArray(node[type] ?? [])
                        .map((value: string) => ({ type, name, value }));

                    if (result) {
                        testsuites.push(...result);
                    }
                });

                return testsuites;
            }, []);
    }

    get(key: string, defaultValue: any = undefined) {
        return get(this.root, key, defaultValue);
    }
}

export const parse = (text: string) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
    });

    return new Parser(parser.parse(text));
};