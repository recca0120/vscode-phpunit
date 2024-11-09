import { PHPUnitXML, Test, TestCaseParser, TestSuite } from './phpunit';
import { Uri } from 'vscode';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

function groupBy<T extends { [propName: string]: any }>(items: T[], key: string): {
    [propName: string]: T[];
} {
    if (!items) {
        return {};
    }

    return items.reduce((acc, item: T) => {
        const itemKey = item[key] as string;

        if (!acc[itemKey]) {
            acc[itemKey] = [];
        }

        acc[itemKey].push(item);

        return acc;
    }, {} as any);
}

const textDecoder = new TextDecoder('utf-8');

export class TestCollection {
    private items: Test[];

    constructor(private root: string, private parser: TestCaseParser, private phpunitXML: PHPUnitXML) {
        this.items = [];
    }

    async addUri(uri: Uri) {
        const map = this.phpunitXML.getTestSuites()
            .filter((test: TestSuite) => test.tagName === 'directory')
            .map((test: TestSuite) => [
                Uri.file(path.join(this.root, test.value)).fsPath,
                test.name,
            ]);

        const file = uri.fsPath;
        const text = textDecoder.decode(await readFile(file));
        this.parser.parse(text, file, {
            onSuite: (test: Test) => {
                this.items.push(test);
            },
            onTest: (test: Test) => {
                this.items.push(test);
            },
        });
    }
}