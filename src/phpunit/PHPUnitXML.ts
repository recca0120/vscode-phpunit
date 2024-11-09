import { XMLParser } from 'fast-xml-parser';

type TestSuite = {
    tagName: string;
    group: string;
    value: string;
    prefix?: string;
    suffix?: string;
};

type Include = {
    tagName: string;
    value: string;
    prefix?: string;
    suffix?: string;
};

type Exclude = Include;
type IncludeOrExclude = Include | Exclude;

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

class Element {
    constructor(private readonly node: any) {
    }

    getAttribute(key: string) {
        return this.node[`@_${key}`] ?? undefined;
    }

    getText() {
        if (typeof this.node === 'string') {
            return this.node;
        }

        return this.node['#text'];
    }

    querySelectorAll(selector: string) {
        const segments = selector.split(' ');
        let current = this.node;
        while (segments.length > 0) {
            const segment = segments.shift()!;
            current = current[segment] ?? undefined;

            if (current === undefined) {
                return [];
            }
        }

        return this.ensureArray(current).map((node) => new Element(node));
    }

    private ensureArray(obj: any) {
        return Array.isArray(obj) ? obj : [obj];
    }
}

export class PHPUnitXML {
    private readonly element: Element;

    constructor(text: string | Buffer | Uint8Array) {
        this.element = new Element(parser.parse(text.toString()));
    }

    getTestSuites() {
        const callback = (tagName: string, node: Element, parent: Element) => {
            const group = parent.getAttribute('name') as string;
            const prefix = node.getAttribute('prefix');
            const suffix = node.getAttribute('suffix');

            return { tagName, group, value: node.getText(), prefix, suffix };
        };

        return this.getDirectoriesAndFiles<TestSuite>('phpunit testsuites testsuite', {
            directory: callback,
            file: callback,
            exclude: callback,
        });
    }

    getIncludes(): Include[] {
        return this.getIncludesOrExcludes('phpunit source include');
    }

    getExcludes(): Exclude[] {
        return this.getIncludesOrExcludes('phpunit source exclude');
    }

    getSources() {
        const appendType = (type: string, objs: IncludeOrExclude[]) =>
            objs.map((obj) => ({ type, ...obj }));

        return [
            ...appendType('include', this.getIncludes()),
            ...appendType('exclude', this.getExcludes()),
        ];
    }

    private getIncludesOrExcludes(key: string): IncludeOrExclude[] {
        return this.getDirectoriesAndFiles<IncludeOrExclude>(key, {
            directory: (tagName: string, node: Element) => {
                const prefix = node.getAttribute('prefix');
                const suffix = node.getAttribute('suffix');

                return { tagName, value: node.getText(), prefix, suffix };
            },
            file: (tagName: string, node: Element) => ({ tagName, value: node.getText() }),
        });
    }

    private getDirectoriesAndFiles<T>(
        selector: string,
        callbacks: {
            [propName: string]: (tagName: string, node: Element, parent: Element) => T;
        },
    ) {
        return this.element.querySelectorAll(selector).reduce((results: T[], parent: Element) => {
            for (const [type, callback] of Object.entries(callbacks)) {
                const temp = parent
                    .querySelectorAll(type)
                    .map((node) => callback(type, node, parent));

                if (temp) {
                    results.push(...temp);
                }
            }

            return results;
        }, []);
    }
}
