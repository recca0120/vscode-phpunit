import _files from './Filesystem';
import URI from 'vscode-uri';
import { PathLike } from 'fs';
import { Process } from './Process';
import { TestSuiteCollection } from './TestSuiteCollection';
import {
    TextDocument,
    Position,
    CodeLens,
    Command,
} from 'vscode-languageserver-protocol';

export interface TestRunnerParams {
    textDocument?: TextDocument;
    position?: Position;
    suites?: TestSuiteCollection;
    codeLens?: CodeLens;
}

export class TestRunner {
    private phpBinary = '';
    private phpUnitBinary = '';
    private args: string[] = [];
    private lastArgs: string[] = [];

    constructor(private process = new Process(), private files = _files) {}

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

    async rerun(params: TestRunnerParams) {
        if (this.lastArgs.length === 0) {
            return await this.runTestAtCursor(params);
        }

        return await this.doRun(this.lastArgs);
    }

    async runDirectory(params: TestRunnerParams) {
        return await this.doRun([
            this.files.dirname(
                this.files.asUri(params.textDocument.uri).fsPath
            ),
        ]);
    }

    async runFile(params: TestRunnerParams) {
        return await this.doRun([
            this.files.asUri(params.textDocument.uri).fsPath,
        ]);
    }

    async runTestAtCursor(params: TestRunnerParams) {
        const suite = await params.suites.get(params.textDocument.uri);

        if (!suite) {
            return undefined;
        }

        const line = params.position.line;
        const codeLens = suite
            .exportCodeLens()
            .find((codeLens: CodeLens) =>
                this.findCodeLensAtCursor(codeLens, line)
            );

        return codeLens ? await this.runCodeLens({ codeLens }) : undefined;
    }

    async runCodeLens(params: TestRunnerParams) {
        return await this.doRun(params.codeLens.data.arguments);
    }

    async doRun(args: string[] = []) {
        this.lastArgs = args;

        return await this.process.run(await this.getCommand(args));
    }

    cancel(): boolean {
        return this.process.kill();
    }

    private async getCommand(args: string[]): Promise<Command> {
        let thisArgs = [];

        const phpBinary = this.getPhpBinary();

        if (phpBinary) {
            thisArgs.push(phpBinary);
        }

        const phpUnitBinary = await this.getPhpUnitBinary();

        if (phpUnitBinary) {
            thisArgs.push(phpUnitBinary);
        }

        thisArgs = thisArgs.concat(this.args, args).filter(arg => !!arg);

        return {
            title: 'PHPUnit LSP',
            command: thisArgs.shift(),
            arguments: thisArgs,
        };
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
