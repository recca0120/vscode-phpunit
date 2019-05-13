import Parser, { TestSuite } from './Parser';
import URI from 'vscode-uri';
import { default as _files } from './Filesystem';
import { PathLike } from 'fs';
import { TextDocument } from 'vscode-languageserver-protocol';
import { TestSuiteInfo, TestInfo } from './TestExplorer';

export class TestSuiteCollection {
    private suites: Map<string, TestSuite> = new Map<string, TestSuite>();

    constructor(private files = _files, private parser = new Parser()) {}

    async load(uri: PathLike | URI = process.cwd()) {
        uri = this.files.asUri(uri);

        const files = await this.files.glob('**/*.php', {
            absolute: true,
            ignore: 'vendor/**',
            cwd: uri.fsPath,
        });

        await Promise.all(files.map(file => this.put(file)));

        return this;
    }

    async put(uri: PathLike | URI): Promise<TestSuiteCollection> {
        return this.putTestSuite(
            this.files.asUri(uri),
            await this.parser.parse(uri)
        );
    }

    putTextDocument(textDocument: TextDocument): TestSuiteCollection {
        return this.putTestSuite(
            this.files.asUri(textDocument.uri),
            this.parser.parseTextDocument(textDocument)
        );
    }

    async get(uri: PathLike | URI) {
        return this.suites.get(this.files.asUri(uri).toString());
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

    all() {
        return this.suites;
    }

    asArray(): TestSuite[] {
        return Array.from(this.all().values());
    }

    private putTestSuite(uri: URI, suite: TestSuite) {
        const key = uri.toString();

        if (this.suites.has(key)) {
            this.suites.delete(key);
        }

        if (suite) {
            this.suites.set(key, suite);
        }

        return this;
    }

    private toTestSuiteInfo(suite: TestSuite): TestSuiteInfo {
        return {
            type: 'suite',
            id: suite.id,
            label: suite.label,
            children: suite.children.map(test => {
                return test instanceof TestSuite
                    ? this.toTestSuiteInfo(test)
                    : ({
                          type: 'test',
                          id: test.id,
                          label: test.label,
                      } as TestInfo);
            }),
        };
    }
}
