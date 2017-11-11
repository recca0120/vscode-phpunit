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
import { resolve as pathResolve } from 'path';
import { tap } from './helpers';

export class DiagnosticManager {
    constructor(private diagnostics: DiagnosticCollection) {}

    handle(store: Store, editor: TextEditor) {
        store.forEach((testCases: TestCase[], file: string) => {
            this.diagnostics.set(
                Uri.file(file),
                testCases
                    .filter(
                        testCase =>
                            testCase.type !== Type.PASSED
                    )
                    .map(testCase => this.convertToDiagnostic(testCase, editor))
                    .filter(diagnostic => diagnostic !== null)
            );
        });
    }

    dispose() {
        this.diagnostics.clear();
        this.diagnostics.dispose();
    }

    private convertToDiagnostic(testCase: TestCase, editor?: TextEditor): Diagnostic {
        return tap(
            new Diagnostic(
                this.convertToRange(testCase, editor),
                testCase.fault.message,
                testCase.type === Type.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
            ),
            (diagnostic: Diagnostic) => {
                diagnostic.source = 'PHPUnit';
            }
        );
    }

    private convertToRange(testCase: TestCase, editor?: TextEditor) {
        if (pathResolve(editor.document.fileName) === pathResolve(testCase.file)) {
            const textLine: TextLine = editor.document.lineAt(testCase.line - 1);
            
            return new Range(
                new Position(textLine.lineNumber, textLine.firstNonWhitespaceCharacterIndex),
                new Position(textLine.lineNumber, textLine.range.end.character + 1)
            );
        } else {
            return new Range(
                new Position(testCase.line, 0),
                new Position(testCase.line, 1000)
            );
        }
        
    }
}
