import { PHPUnitXML, TestSuite } from './phpunit';
import { Uri } from 'vscode';
import * as path from 'node:path';

const textDecoder = new TextDecoder('utf-8');

const getExtension = (fileName: string) => {
    const pos = fileName.lastIndexOf('.');
    if (pos === -1) {
        return;
    }

    return fileName.substring(pos + 1);
};

export class TestCollection {
    private readonly _items: any;

    constructor(private root: string, private phpUnitXML: PHPUnitXML) {
        this._items = {};
    }

    items() {
        return this._items;
    }

    add(uri: Uri) {
        this.groups(uri).forEach((name) => {
            if (!this._items.hasOwnProperty(name)) {
                this._items[name] = [];
            }
            this._items[name].push(uri);
        });

        return this;
    }

    private groups(uri: Uri) {
        const testSuites = this.phpUnitXML.getTestSuites();
        const includes: string[] = [];
        const excludes: string[] = [];

        testSuites.filter((item) => this.include(item, uri)).forEach((item) => {
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
        const isFile = group.tag === 'file' || (group.tag === 'exclude' && getExtension(group.value));

        if (isFile) {
            return Uri.file(path.join(this.root, group.value)).fsPath === uri.fsPath;
        }

        return path.relative(
            Uri.file(path.join(this.root, group.value)).fsPath,
            Uri.file(path.dirname(uri.fsPath)).fsPath,
        ).indexOf('.') === -1;
    }
}