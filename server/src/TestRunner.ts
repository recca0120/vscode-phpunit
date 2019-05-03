import { TextDocument, Position } from 'vscode-languageserver-protocol';
import Parser, { Test, TestSuite } from './Parser';
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
        const tests: Test[] = this.parser
            .parseTextDocument(textDocument)
            .reduce((tests: Test[], testsuite: TestSuite) => {
                return tests
                    .concat([testsuite as Test])
                    .concat(testsuite.children);
            }, []);

        const line = position && position.line ? position.line : 0;

        let test = tests.find(test => {
            const start = test.range.start.line;
            const end = test.range.end.line;

            return test.kind === 'class'
                ? start >= line || end <= line
                : test.kind !== 'class' && end >= line;
        });

        return test ? await this.doRun(test.asArguments()) : '';
    }

    async run(
        method: string,
        textDocument?: TextDocument,
        position?: Position
    ) {
        const map = {
            all: 'runAll',
            directory: 'runDirectory',
            file: 'runFile',
            'test-at-cursor': 'runTestAtCursor',
            rerun: 'rerun',
        };

        method = method.replace(/^phpunit\.lsp\.(run-)?/, '').toLowerCase();

        method = map[method] || 'runTestAtCursor';

        return await this[method](textDocument, position);
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

    private async getPhpUnitBinary(): Promise<string> {
        if (this.phpUnitBinary) {
            return this.phpUnitBinary;
        }

        return await this.files.findup(['vendor/bin/phpunit', 'phpunit']);
    }
}
