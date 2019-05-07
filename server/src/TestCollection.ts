import Parser, { TestSuite } from './Parser';
import URI from 'vscode-uri';
import { default as _files } from './Filesystem';
import { PathLike } from 'fs';
import { TextDocument } from 'vscode-languageserver';

export class TestCollection {
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

    async put(uri: PathLike | URI): Promise<TestCollection> {
        return this.putTestSuite(
            this.files.asUri(uri),
            await this.parser.parse(uri)
        );
    }

    putTextDocument(textDocument: TextDocument): TestCollection {
        return this.putTestSuite(
            this.files.asUri(textDocument.uri),
            this.parser.parseTextDocument(textDocument)
        );
    }

    async get(uri: PathLike | URI) {
        uri = this.files.asUri(uri);

        if (!this.suites.has(uri.toString())) {
            await this.put(uri);
        }

        return this.suites.get(this.files.asUri(uri).toString());
    }

    all() {
        return this.suites;
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
}
