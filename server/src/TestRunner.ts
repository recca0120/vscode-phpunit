import {
    TextDocument,
    Position,
    CodeLens,
} from 'vscode-languageserver-protocol';
import Parser, { TestSuiteInfo } from './Parser';
import _files from './Filesystem';
import { Process } from './Process';
import { PathLike } from 'fs';
import URI from 'vscode-uri';

export class TestRunner {
    private phpBinary = '';
    private phpUnitBinary = '';
    private args: string[] = [];
    private lastArgs: string[] = [];

    constructor(
        private process = new Process(),
        private files = _files,
        private parser = new Parser()
    ) {}

    setPhpBinary(phpBinary: PathLike | URI) {
        this.phpBinary = this.files.asUri(phpBinary).fsPath;

        return this;
    }

    setPhpUnitBinary(phpUnitBinary: PathLike | URI) {
        this.phpUnitBinary = this.files.asUri(phpUnitBinary).fsPath;

        return this;
    }

    setArgs(args: string[]) {
        this.args = args;

        return this;
    }

    async runAll() {
        return await this.doRun();
    }

    async rerun(textDocument: TextDocument, position?: Position) {
        if (this.lastArgs.length === 0) {
            return await this.runTestAtCursor(textDocument, position);
        }

        return await this.doRun(this.lastArgs);
    }

    async runDirectory(textDocument: TextDocument) {
        return await this.doRun([
            this.files.dirname(this.files.asUri(textDocument.uri).fsPath),
        ]);
    }

    async runFile(textDocument: TextDocument) {
        return await this.doRun([this.files.asUri(textDocument.uri).fsPath]);
    }

    async runTestAtCursor(textDocument: TextDocument, position?: Position) {
        const testSuite: TestSuiteInfo = this.parser.parseTextDocument(
            textDocument
        );

        if (!testSuite) {
            return '';
        }

        const line = position && position.line ? position.line : 0;
        const codeLens = testSuite
            .exportCodeLens()
            .find(codeLens => this.findCodeLensAtCursor(codeLens, line));

        return codeLens ? await this.doRun(codeLens.data.arguments) : '';
    }

    async run(
        method: string,
        textDocument?: TextDocument,
        position?: Position
    ) {
        method = method.replace(/^phpunit\.lsp\.(run-)?/, '').toLowerCase();

        let response;
        switch (method) {
            case 'all':
                response = await this.runAll();
                break;
            case 'directory':
                response = await this.runDirectory(textDocument);
                break;
            case 'file':
                response = await this.runFile(textDocument);
                break;
            case 'rerun':
                response = await this.rerun(textDocument, position);
                break;
            default:
            case 'test-at-cursor':
                response = await this.runTestAtCursor(textDocument, position);
        }

        return response;
    }

    async doRun(args: string[] = []) {
        this.lastArgs = args;
        let command = [];

        const phpBinary = this.getPhpBinary();

        if (phpBinary) {
            command.push(phpBinary);
        }

        const phpUnitBinary = await this.getPhpUnitBinary();

        if (phpUnitBinary) {
            command.push(phpUnitBinary);
        }

        command = command.concat(this.args, args).filter(arg => !!arg);

        return await this.process.run({
            title: 'PHPUnit LSP',
            command: command.shift(),
            arguments: command,
        });
    }

    private getPhpBinary(): string {
        return this.phpBinary;
    }

    private async getPhpUnitBinary(): Promise<string | void> {
        if (this.phpUnitBinary) {
            return this.phpUnitBinary;
        }

        return await this.files.findup(['vendor/bin/phpunit', 'phpunit']);
    }

    private findCodeLensAtCursor(codeLens: CodeLens, line: number) {
        const { type, range } = codeLens.data;
        const start = range.start.line;
        const end = range.end.line;

        if (type === 'suite') {
            return start >= line || end <= line;
        }

        return type !== 'suite' && end >= line;
    }
}