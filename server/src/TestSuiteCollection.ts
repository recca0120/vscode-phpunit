import files from './Filesystem';
import Parser from './Parser';
import URI from 'vscode-uri';
import { IOptions } from 'glob';
import { PathLike } from 'fs';
import { TestInfo, TestSuiteInfo } from './TestExplorer';
import { TestNode, TestSuiteNode } from './TestNode';
import { TextDocument } from 'vscode-languageserver-protocol';

export class TestSuiteCollection {
    private suites: Map<string, TestSuiteNode> = new Map<
        string,
        TestSuiteNode
    >();

    constructor(private parser = new Parser(), private _files = files) {}

    async load(pattern: string, options: IOptions = { cwd: process.cwd() }) {
        const defaults = {
            absolute: true,
            strict: false,
        };

        const files = await this._files.glob(
            pattern,
            Object.assign(defaults, options)
        );

        (await Promise.all(
            files.map(async file => [file, await this._files.get(file)])
        )).forEach(([file, code]) => {
            this.put(file, code);
        });

        return this;
    }

    async put(
        uri: PathLike | URI,
        code?: string
    ): Promise<TestSuiteCollection> {
        const suite = code
            ? this.parser.parseCode(code, uri)
            : await this.parser.parse(uri);

        return this.putTestSuite(this._files.asUri(uri), suite);
    }

    putTextDocument(document: TextDocument | undefined): TestSuiteCollection {
        if (!document) {
            return this;
        }

        return this.putTestSuite(
            this._files.asUri(document.uri),
            this.parser.parseTextDocument(document)
        );
    }

    get(uri: PathLike | URI) {
        return this.suites.get(this._files.asUri(uri).toString());
    }

    delete(uri: PathLike | URI) {
        return this.suites.delete(this._files.asUri(uri).toString());
    }

    clear() {
        this.suites.clear();

        return this;
    }

    tree(): TestSuiteInfo {
        const children: TestSuiteInfo[] = [];

        this.suites.forEach(suite => {
            children.push(this.toTestSuiteInfo(suite));
        });

        return {
            type: 'suite',
            id: 'root',
            label: 'PHPUnit',
            children: children,
        };
    }

    where(filter: (test: TestSuiteNode | TestNode) => {}, single = false) {
        const suites = this.all();
        const tests: (TestSuiteNode | TestNode)[] = [];

        for (const suite of suites) {
            if (filter(suite)) {
                tests.push(suite);

                if (single === true) {
                    return tests;
                }
            }

            for (const test of suite.children) {
                if (filter(test)) {
                    tests.push(test);

                    if (single === true) {
                        return tests;
                    }
                }
            }
        }

        return tests;
    }

    find(id: string): TestSuiteNode | TestNode {
        return this.where(test => {
            return id === test.id;
        }, true)[0];
    }

    all(): TestSuiteNode[] {
        return Array.from(this.suites.values());
    }

    private putTestSuite(uri: URI, suite: TestSuiteNode | undefined) {
        if (!suite) {
            return this;
        }

        const key = uri.toString();

        if (this.suites.has(key)) {
            this.suites.delete(key);
        }

        this.suites.set(key, suite);

        return this;
    }

    private toTestSuiteInfo(suite: TestSuiteNode): TestSuiteInfo {
        return {
            type: 'suite',
            id: suite.id,
            label: suite.label,
            file: suite.file,
            line: suite.line,
            children: suite.children.map(test => {
                return test instanceof TestSuiteNode
                    ? this.toTestSuiteInfo(test)
                    : ({
                          type: 'test',
                          id: test.id,
                          label: test.label,
                          file: test.file,
                          line: test.line,
                      } as TestInfo);
            }),
        };
    }
}
