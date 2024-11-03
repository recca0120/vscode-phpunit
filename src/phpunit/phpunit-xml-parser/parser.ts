import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'node:fs/promises';
import { PathLike } from 'node:fs';

function ensureArray(obj: any) {
    return Array.isArray(obj) ? obj : [obj];
}

function $(node: any, selector: string) {
    const segments = selector.split(' ');
    let current = node;
    while (segments.length > 0) {
        const segment = segments.shift()!;
        current = current[segment] ?? undefined;

        if (current === undefined) {
            return [];
        }
    }

    return ensureArray(current).map(node => new Element(node));
}

class Element {
    constructor(private node: any) {
    }

    getAttribute(key: string) {
        const symbol = '@';

        return this.node[`${symbol}_${key}`] ?? undefined;
    }

    getText() {
        if (typeof this.node === 'string') {
            return this.node;
        }

        return this.node['#text'];
    }

    find(selector: string) {
        return $(this.node, selector);
    }
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


class PHPUnitXML {
    constructor(private root: any) {
    }

    getTestSuites() {
        const callback = (tagName: string, node: Element, parent: Element) => {
            const name = parent.getAttribute('name') as string;

            return { tagName, name, value: node.getText() };
        };

        return this.getDirectoriesAndFiles<TestSuite>('phpunit testsuites testsuite', {
            'directory': callback,
            'file': callback,
            'exclude': callback,
        });
    }

    getIncludes(): Include[] {
        return this.getIncludesOrExcludes('phpunit source include');
    }

    getExcludes(): Exclude[] {
        return this.getIncludesOrExcludes('phpunit source exclude');
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
            'directory': (tagName: string, node: Element) => {
                const prefix = node.getAttribute('prefix');
                const suffix = node.getAttribute('suffix');

                return { tagName, value: node.getText(), prefix, suffix };
            },
            'file': (tagName: string, node: Element) => {
                return { tagName, value: node.getText() };
            },
        });
    }

    private find(key: string) {
        return $(this.root, key);
    }

    private getDirectoriesAndFiles<T>(key: string, callbacks: {
        [propName: string]: (tagName: string, node: Element, parent: Element) => T
    }) {
        return this.find(key).reduce((results: T[], parent: Element) => {
            for (const [type, callback] of Object.entries(callbacks)) {
                const temp = parent.find(type).map((node) => callback(type, node, parent));

                if (temp) {
                    results.push(...temp);
                }
            }

            return results;
        }, []);
    }
}

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

export const parse = (text: Buffer | string) => {
    return new PHPUnitXML(parser.parse(text.toString()));
};

export const parseXML = async (path: PathLike) => {
    return parse(await readFile(path));
};