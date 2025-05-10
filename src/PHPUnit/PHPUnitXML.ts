import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative } from 'node:path';
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

    toGlobPattern(): { uri: URI; pattern: string } {
        // Extract base directories from items that don't start with '*'
        const baseDirs = Array.from(new Set(this.items
            .filter(item => !item.startsWith('*'))
            .map(item => {
                const firstSlash = item.indexOf('/');
                return firstSlash === -1 ? '' : item.substring(0, firstSlash);
            })
        ));

        // If there's a single, non-empty base directory, use it as the base for RelativePattern
        if (baseDirs.length === 1 && baseDirs[0] !== '') {
            const baseDir = baseDirs[0];
            const itemsRelativeToBase = this.items.map(item => {
                // Remove the base directory prefix if it exists
                if (item.startsWith(baseDir + '/')) {
                    return item.substring(baseDir.length + 1);
                }
                // If item doesn't have the base prefix but is not a glob, it's likely an issue,
                // but for now, keep it as is or handle as appropriate for the expected input.
                // Assuming items either start with baseDir/ or are globs like **/*.php
                return item;
            });
             // Filter out empty strings that might result from items exactly matching the baseDir
            const pattern = `{${itemsRelativeToBase.filter(item => item !== '').join(',')}}`;
            return { uri: URI.file(join(this.root, baseDir)), pattern };
        } else {
            // Otherwise, use the root as the base and the full items as the pattern
            const pattern = `{${this.items.join(',')}}`;
            return { uri: URI.file(this.root), pattern };
        }
    }
}

export class PHPUnitXML {
    private element?: Element;
    private _file: string = '';
    private _root: string = '';
    private readonly cached: Map<string, any> = new Map();

    load(text: string | Buffer | Uint8Array, file: string) {
        this.element = new Element(parser.parse(text.toString()));
        this._file = file;
        this.setRoot(dirname(file));

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

    path(file: string): string {
        const root = this.root();

        return isAbsolute(file) || !root ? file : join(root, file);
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
