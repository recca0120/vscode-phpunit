import { PHPUnitXML, Test, TestParser, TestSuite } from './index';
import { Uri } from 'vscode';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';

const textDecoder = new TextDecoder('utf-8');

export class TestCollection {
    private readonly _items: Map<string, Map<string, Test[]>>;

    constructor(private phpUnitXML: PHPUnitXML, private testParser: TestParser, private root: string) {
        this._items = new Map<string, Map<string, Test[]>>();
    }

    items() {
        return this._items;
    }

    async add(uri: Uri) {
        if (this.has(uri)) {
            return this;
        }

        const groups = this.groups(uri);

        if (groups.length === 0) {
            return this;
        }

        const tests = this.testParser.parse(
            textDecoder.decode(await readFile(uri.fsPath)),
            uri.fsPath,
        );

        if (!tests || tests.length === 0) {
            return this;
        }

        groups.forEach((name) => {
            if (!this._items.has(name)) {
                this._items.set(name, new Map<string, Test[]>());
            }
            this._items.get(name)!.set(uri.fsPath, tests);
        });

        return this;
    }

    has(uri: Uri) {
        return this.find(uri).size > 0;
    }

    delete(uri: Uri) {
        let deleted = false;
        const found = this.find(uri);
        for (const [name, fsPath] of found) {
            const files = this._items.get(name);
            if (files) {
                files.delete(fsPath);
                deleted = true;
            }
        }

        return deleted;
    }

    find(uri: Uri) {
        const found = new Map<string, string>();
        for (const [name, group] of this._items) {
            const files = group.get(uri.fsPath);
            if (files) {
                found.set(name, uri.fsPath);
            }
        }

        return found;
    }

    private groups(uri: Uri) {
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

    private include(group: TestSuite, uri: Uri) {
        const isFile = group.tag === 'file' || (group.tag === 'exclude' && path.extname(group.value));

        if (isFile) {
            return Uri.file(path.join(this.root, group.value)).fsPath === uri.fsPath;
        }

        return path.relative(
            Uri.file(path.join(this.root, group.value)).fsPath,
            Uri.file(path.dirname(uri.fsPath)).fsPath,
        ).indexOf('.') === -1;
    }
}