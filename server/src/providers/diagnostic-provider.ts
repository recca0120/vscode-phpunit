import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { Test, Type } from '../phpunit';

export class DiagnosticProvider {
    provideDiagnostics(textDocument: TextDocument, tests: Test[]): Diagnostic[] {
        const lines: string[] = textDocument.getText().split(/\r?\n/);

        return tests.filter(this.filterByType.bind(this)).map((test: Test) => this.convertToDiagonstic(test, lines));
    }

    private convertToDiagonstic(test: Test, lines: string[]) {
        const lineIndex = test.line - 1;
        const line = lines[lineIndex];
        const firstNonWhitespaceCharacterIndex = line.search(/\S|$/);

        return {
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: lineIndex, character: firstNonWhitespaceCharacterIndex },
                end: { line: lineIndex, character: line.trim().length + firstNonWhitespaceCharacterIndex },
            },
            message: test.fault.message,
            source: 'phpunit',
        };
    }

    private filterByType(test: Test): boolean {
        return [Type.ERROR, Type.FAILED, Type.FAILURE].indexOf(test.type) !== -1;
    }
}
