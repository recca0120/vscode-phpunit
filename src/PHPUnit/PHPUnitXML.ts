import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { TestGlobPattern } from './TestGlobPattern';
import { XmlElement } from './XmlElement';

export { TestGlobPattern };

type Source = { tag: string; value: string; prefix?: string; suffix?: string };

export type TestSuite = Source & { name: string };

export class PHPUnitXML {
    private element?: XmlElement;
    private _file: string = '';
    private _configRoot: string = '';
    private _root: string = '';
    private readonly cached: Map<string, unknown[]> = new Map();

    load(text: string | Buffer | Uint8Array, file: string) {
        this.element = XmlElement.load(text.toString());
        this._file = file;
        this.setRoot(dirname(file));
        this._root = this.resolveProjectRoot();

        return this;
    }

    async loadFile(file: string) {
        this.load(await readFile(file), file);

        return this;
    }

    setRoot(root: string) {
        this.cached.clear();
        this._configRoot = root;
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
        const configRoot = this._configRoot;

        return isAbsolute(file) || !configRoot ? file : join(configRoot, file);
    }

    private resolveToRoot(root: string, value: string): string {
        if (this._configRoot === root) {
            return value;
        }

        return normalize(relative(root, resolve(this._configRoot, value)));
    }

    private resolveProjectRoot(): string {
        const configRoot = this._configRoot;
        if (!this.element) {
            return configRoot;
        }

        for (const parent of this.element.querySelectorAll('phpunit testsuites testsuite')) {
            for (const node of parent.querySelectorAll('directory')) {
                const dir = node.getText();
                if (dir.startsWith('..')) {
                    const resolvedAbs = resolve(configRoot, dir);
                    const configRootAbs = resolve(configRoot);

                    if (!resolvedAbs.startsWith(configRootAbs)) {
                        return normalize(resolve(configRoot, dir, '..'));
                    }
                }
            }
        }

        return configRoot;
    }

    getTestSuites(): TestSuite[] {
        const root = this.root();

        const callback = (tag: string, node: XmlElement, parent: XmlElement) => {
            const name = parent.getAttribute('name') as string;
            const prefix = node.getAttribute('prefix');
            const suffix = node.getAttribute('suffix');

            return { tag, name, value: this.resolveToRoot(root, node.getText()), prefix, suffix };
        };

        const testSuites = this.getDirectoriesAndFiles<TestSuite>('phpunit testsuites testsuite', {
            directory: callback,
            file: callback,
            exclude: callback,
        });

        return testSuites.length > 0
            ? testSuites
            : [
                  { tag: 'directory', name: 'default', value: '', suffix: '.php' },
                  { tag: 'exclude', name: 'default', value: 'vendor' },
              ];
    }

    getPatterns(root: string) {
        const includes = new TestGlobPattern(root, this.root());
        const excludes = new TestGlobPattern(root, this.root(), [
            '**/.git/**',
            '**/node_modules/**',
        ]);

        this.getTestSuites().forEach((item) => {
            item.tag !== 'exclude' ? includes.push(item, '.php') : excludes.push(item);
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
        const appendType = (type: string, objs: Source[]) => objs.map((obj) => ({ type, ...obj }));

        return [
            ...appendType('include', this.getIncludes()),
            ...appendType('exclude', this.getExcludes()),
        ];
    }

    private fromCache<T>(key: string, callback: () => T[]): T[] {
        if (!this.cached.has(key)) {
            this.cached.set(key, callback() ?? []);
        }

        return this.cached.get(key) as T[];
    }

    private getIncludesOrExcludes(key: string): Source[] {
        return this.getDirectoriesAndFiles<Source>(key, {
            directory: (tag: string, node: XmlElement) => {
                const prefix = node.getAttribute('prefix');
                const suffix = node.getAttribute('suffix');

                return { tag, value: node.getText(), prefix, suffix };
            },
            file: (tag: string, node: XmlElement) => ({ tag, value: node.getText() }),
        });
    }

    private getDirectoriesAndFiles<T>(
        selector: string,
        callbacks: { [key: string]: (tag: string, node: XmlElement, parent: XmlElement) => T },
    ) {
        if (!this.element) {
            return [];
        }

        return this.fromCache<T>(selector, () => {
            return this.element!.querySelectorAll(selector).reduce(
                (results: T[], parent: XmlElement) => {
                    for (const [type, callback] of Object.entries(callbacks)) {
                        const temp = parent
                            .querySelectorAll(type)
                            .map((node) => callback(type, node, parent));

                        if (temp) {
                            results.push(...temp);
                        }
                    }

                    return results;
                },
                [],
            );
        });
    }
}
