import { readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { URI } from 'vscode-uri';
import { PHPUnitXML, Test, TestParser, TestSuite } from './index';

type Tests = Map<string, Test[]>
type Group = Map<string, Tests>
type Root = Map<string, Group>

const textDecoder = new TextDecoder('utf-8');

export class TestCollection {
    private readonly _items: Root;

    constructor(private phpUnitXML: PHPUnitXML, private testParser: TestParser) {
        this._items = new Map<string, Group>();
    }

    items() {
        const root = this.root();
        if (!this._items.has(root)) {
            this._items.set(root, new Map<string, Tests>());
        }

        return this._items.get(root)!;
    }

    async add(uri: URI) {
        if (this.has(uri)) {
            return this;
        }

        const groups = this.groups(uri);
        if (groups.length === 0) {
            return this;
        }

        const items = this.items();

        const tests = await this.parseTests(uri);
        if (!tests || tests.length === 0) {
            return this;
        }

        groups.forEach((name) => {
            if (!items.has(name)) {
                items.set(name, new Map<string, Test[]>());
            }

            items.get(name)!.set(uri.fsPath, tests);
        });

        return this;
    }

    has(uri: URI) {
        return this.find(uri).size > 0;
    }

    delete(uri: URI) {
        const items = this.items();

        if (!items) {
            return false;
        }

        let deleted = false;
        const found = this.find(uri);
        for (const [name, fsPath] of found) {
            const files = items.get(name);
            if (files?.delete(fsPath)) {
                deleted = true;
            }
        }

        return deleted;
    }

    find(uri: URI) {
        const found = new Map<string, string>();
        const items = this.items();

        items.forEach((group, name) => {
            if (group.has(uri.fsPath)) {
                found.set(name, uri.fsPath);
            }
        });

        return found;
    }

    protected async parseTests(uri: URI) {
        return this.testParser.parse(
            textDecoder.decode(await readFile(uri.fsPath)),
            uri.fsPath,
        );
    }

    private groups(uri: URI) {
        const includes: string[] = [];
        const excludes: string[] = [];

        this.phpUnitXML.getTestSuites()
            .filter((item) => this.include(item, uri))
            .forEach((item) => {
                if (item.tag !== 'exclude' && !includes.includes(item.name)) {
                    includes.push(item.name);
                }

                if (item.tag === 'exclude' && !excludes.includes(item.name)) {
                    excludes.push(item.name);
                }
            });

        return includes.filter(group => !excludes.includes(group));
    }

    private include(group: TestSuite, uri: URI) {
        const isFile = group.tag === 'file' || (group.tag === 'exclude' && extname(group.value));
        const root = this.root();

        return isFile
            ? join(root, group.value) === uri.fsPath
            : !relative(join(root, group.value), dirname(uri.fsPath)).startsWith('.');
    }

    private root() {
        return URI.file(this.phpUnitXML.root()).fsPath;
    }
}