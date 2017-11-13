import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    Position,
    Range,
    TextDocument,
    TextEditor,
    TextLine,
    Uri,
} from 'vscode';
import { TestCase, Type } from './parser';

import { Store } from './store';
import { resolve as pathResolve } from 'path';
import { tap } from './helpers';

export class DiagnosticManager {
    constructor(private diagnostics: DiagnosticCollection) {}

    handle(store: Store, editors: TextEditor[]) {
        editors.forEach((editor: TextEditor) => {
            store.forEach((testCases: TestCase[], file: string) => {
                Promise.all(
                    testCases
                        .filter(testCase => testCase.type !== Type.PASSED)
                        .map(testCase => this.convertToDiagnostic(testCase, editor.document))
                ).then((diagnostics: Diagnostic[]) => {
                    this.diagnostics.set(Uri.file(file), diagnostics.filter(diagnostic => diagnostic !== null));
                });
            });
        });
    }

    private convertToDiagnostic(testCase: TestCase, document?: TextDocument): Promise<Diagnostic> {
        return this.convertToRange(testCase, document).then((range: Range) => {
            return tap(
                new Diagnostic(
                    range,
                    testCase.fault.message,
                    testCase.type === Type.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
                ),
                (diagnostic: Diagnostic) => {
                    diagnostic.source = 'PHPUnit';
                }
            );
        });
    }

    private convertToRange(testCase: TestCase, document?: TextDocument): Promise<Range> {
        return new Promise(resolve => {
            const line = testCase.line - 1;
            let start = 0;
            let end = 1000;

            if (pathResolve(document.fileName) === pathResolve(testCase.file)) {
                const textLine: TextLine = document.lineAt(testCase.line);
                start = textLine.firstNonWhitespaceCharacterIndex;
                end = textLine.range.end.character + 1;
            }

            resolve(new Range(new Position(line, start), new Position(line, end)));
        });
    }

    dispose() {
        this.diagnostics.clear();
        this.diagnostics.dispose();
    }
}
