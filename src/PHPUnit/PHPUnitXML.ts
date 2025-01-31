import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize, relative } from 'node:path';
import { URI } from 'vscode-uri';

type Source = { tag: string; value: string; prefix?: string; suffix?: string; };

export type TestSuite = Source & { name: string };

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

class Element {
    constructor(private readonly node: any) {}

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

export class Pattern {
    private readonly relativePath: string;

    constructor(private root: string, private testPath: string, private items: string[] = []) {
        this.relativePath = Pattern.normalizePath(relative(this.root, this.testPath));
    }

    private static normalizePath(...paths: string[]) {
        return normalize(paths.join('/')).replace(/\\|\/+/g, '/');
    }

    push(item: TestSuite, extension: string = '') {
        const args = [this.relativePath, item.value];
        if (item.tag !== 'file') {
            args.push('**/*' + (item.suffix ?? extension));
        }

        this.items.push(Pattern.normalizePath(...args));
    }

    toGlobPattern() {
        const arrayUnique = (items: (string | undefined)[]) => Array.from(new Set(items));
        const dirs = arrayUnique(this.items.map((item) => {
            return /^\*/.test(item) ? undefined : item.substring(0, item.indexOf('/'));
        }));

        const legalDirs = dirs.filter(value => !!value);
        const isSingle = dirs.length === 1 && legalDirs.length === 1;
        if (!isSingle) {
            return { uri: URI.file(this.root), pattern: `{${this.items}}` };
        }

        const dir = legalDirs[0];
        const items = this.items.map((item) => item.replace(new RegExp('^' + dir + '[\\/]?'), ''));
        const pattern = `{${items}}`;

        return { uri: URI.file(join(this.root, dir!)), pattern };
    }
}

export class PHPUnitXML {
    private element?: Element;
    private _file: string = '';
    private _root: string = '';
    private readonly cached: Map<string, any> = new Map();

    load(text: string | Buffer | Uint8Array, file: string) {
        this._file = file;
        this.setRoot(dirname(file));
        this.element = new Element(parser.parse(text.toString()));

        return this;
    }

    async loadFile(file: string) {
        this.load(await readFile(file), file);

        return this;
    }

    setRoot(root: string) {
        this.cached.clear();
        this._root = root;

        return this;
    }

    file() {
        return this._file;
    }

    root() {
        return this._root;
    }

    getTestSuites(): TestSuite[] {
        const callback = (tag: string, node: Element, parent: Element) => {
            const name = parent.getAttribute('name') as string;
            const prefix = node.getAttribute('prefix');
            const suffix = node.getAttribute('suffix');

            return { tag, name, value: node.getText(), prefix, suffix };
        };

        const testSuites = this.getDirectoriesAndFiles<TestSuite>('phpunit testsuites testsuite', {
            directory: callback, file: callback, exclude: callback,
        });

        return testSuites.length > 0 ? testSuites : [
            { tag: 'directory', name: 'default', value: '', suffix: '.php' },
            { tag: 'exclude', name: 'default', value: 'vendor' },
        ];
    }

    getPatterns(root: string) {
        const includes = new Pattern(root, this.root());
        const excludes = new Pattern(root, this.root(), ['**/.git/**', '**/node_modules/**']);

        this.getTestSuites().forEach((item) => {
            (item.tag !== 'exclude') ? includes.push(item, '.php') : excludes.push(item);
        });

        return { includes, excludes };
    }

    getIncludes(): Source[] {
        return this.getIncludesOrExcludes('phpunit source include');
    }

    getExcludes(): Source[] {
        return this.getIncludesOrExcludes('phpunit source exclude');
    }

    getSources() {
        const appendType = (type: string, objs: Source[]) =>
            objs.map((obj) => ({ type, ...obj }));

        return [
            ...appendType('include', this.getIncludes()),
            ...appendType('exclude', this.getExcludes()),
        ];
    }

    private fromCache<T>(key: string, callback: () => T[]) {
        if (!this.cached.has(key)) {
            this.cached.set(key, callback() ?? []);
        }

        return this.cached.get(key)!;
    }

    private getIncludesOrExcludes(key: string): Source[] {
        return this.getDirectoriesAndFiles<Source>(key, {
            directory: (tag: string, node: Element) => {
                const prefix = node.getAttribute('prefix');
                const suffix = node.getAttribute('suffix');

                return { tag, value: node.getText(), prefix, suffix };
            },
            file: (tag: string, node: Element) => ({ tag, value: node.getText() }),
        });
    }

    private getDirectoriesAndFiles<T>(
        selector: string,
        callbacks: { [key: string]: (tag: string, node: Element, parent: Element) => T; },
    ) {
        if (!this.element) {
            return [];
        }

        return this.fromCache<T>(selector, () => {
            return this.element!.querySelectorAll(selector).reduce((results: T[], parent: Element) => {
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
        });
    }
}
