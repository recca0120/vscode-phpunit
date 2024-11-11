import { PHPUnitXML, TestParser, TestSuite } from './phpunit';
import { Uri } from 'vscode';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';

const textDecoder = new TextDecoder('utf-8');

export class TestCollection {
    private readonly _items: any;

    constructor(private phpUnitXML: PHPUnitXML, private testParser: TestParser, private root: string) {
        this._items = {};
    }

    items() {
        return this._items;
    }

    async add(uri: Uri) {
        const groups = this.groups(uri);

        if (groups.length > 0) {
            const tests = this.testParser.parse(
                textDecoder.decode(await readFile(uri.fsPath)),
                uri.fsPath,
            );
            if (!tests || tests.length === 0) {
                return this;
            }
        }

        groups.forEach((name) => {
            if (!this._items.hasOwnProperty(name)) {
                this._items[name] = [];
            }
            this._items[name].push(uri);
        });

        return this;
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