import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    Position,
    Range,
    TextEditor,
    TextLine,
    Uri,
} from 'vscode';
import { TestCase, Type } from './parser';

import { Store } from './store';

export class DiagnosticManager {
    constructor(private diagnostics: DiagnosticCollection) {}

    handle(store: Store, editor: TextEditor) {
        store.forEach((testCases: TestCase[], file: string) => {
            this.diagnostics.set(
                Uri.file(file),
                testCases
                    .filter((testCase: TestCase) => {
                        return testCase.type !== Type.PASSED;
                    })
                    .map(testCase => this.convertToDiagnostic(testCase, editor))
            );
        });
    }

    dispose() {
        this.diagnostics.clear();
        this.diagnostics.dispose();
    }

    private convertToDiagnostic(testCase: TestCase, editor?: TextEditor): Diagnostic {
        const diagnostic: Diagnostic = new Diagnostic(
            this.convertToRange(testCase, editor),
            testCase.fault.message,
            testCase.type === Type.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
        );
        diagnostic.source = 'PHPUnit';

        return diagnostic;
    }

    private convertToRange(testCase: TestCase, editor?: TextEditor) {
        const textLine: TextLine = editor.document.lineAt(testCase.line);

        const range = new Range(
            new Position(textLine.lineNumber, textLine.firstNonWhitespaceCharacterIndex),
            new Position(textLine.lineNumber, textLine.range.end.character + 1)
        );

        return range;
    }
}
