import { TextDocument, Position } from 'vscode-languageserver-types';
import Parser, { Test } from './parser';
import _files from './filesystem';
import { Process } from './process';
export class TestRunner {
    private lastArgs = [];

    constructor(
        private process = new Process(),
        private files = _files,
        private parser = new Parser()
    ) {}

    async runSuite() {
        return await this.run();
    }

    async runFile(textDocument: TextDocument) {
        return await this.run([this.files.asUri(textDocument.uri).fsPath]);
    }

    async runNearest(textDocument: TextDocument, position?: Position) {
        const tests: Test[] = this.parser.parseTextDocument(textDocument);
        const line = position && position.line ? position.line : 0;

        let test = tests.find(test => {
            const start = test.range.start.line;
            const end = test.range.end.line;

            return test.kind === 'class'
                ? start >= line || end <= line
                : test.kind !== 'class' && end >= line;
        });

        return test ? await this.run(test.asArguments()) : '';
    }

    async runLast(textDocument: TextDocument, position?: Position) {
        if (this.lastArgs.length === 0) {
            return await this.runNearest(textDocument, position);
        }

        return await this.run(this.lastArgs);
    }

    async run(args?: string[]) {
        this.lastArgs = args;

        return await this.process.run({
            title: 'PHPUnit LSP',
            command: await this.getPHPUnitBinary(),
            arguments: args,
        });
    }

    private async getPHPUnitBinary(): Promise<string> {
        return await this.files.findUp(['vendor/bin/phpunit', 'phpunit']);
    }
}
