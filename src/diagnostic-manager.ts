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
import { Fault, TestCase, Type } from 'phpunit-editor-support';
import { normalizePath, tap } from './helpers';

import { Store } from './store';

export class DiagnosticManager {
    constructor(private diagnostics: DiagnosticCollection) {}

    handle(store: Store, editors: TextEditor[]) {
        this.diagnostics.clear();

        const details = store
            .getDetails()
            .filter((test: TestCase) => test.type !== Type.PASSED)
            .groupBy('key');

        editors.forEach((editor: TextEditor) => {
            const file = editor.document.uri.fsPath;
            const key = normalizePath(file);

            if (details.has(key)) {
                const promises: Promise<Diagnostic>[] = details
                    .get(key)
                    .values()
                    .map((test: TestCase) => this.convertToDiagnostic(test, editor.document));
                Promise.all(promises).then((diagnostics: Diagnostic[]) => {
                    this.diagnostics.set(Uri.file(file), diagnostics.filter(diagnostic => diagnostic !== null));
                });
            }
        });
    }

    private convertToDiagnostic(test: TestCase, document?: TextDocument): Promise<Diagnostic> {
        return this.convertToRange(test, document).then((range: Range) => {
            return tap(
                new Diagnostic(
                    range,
                    (test.fault as Fault).message,
                    [Type.INCOMPLETE, Type.SKIPPED].indexOf(test.type) !== -1
                        ? DiagnosticSeverity.Warning
                        : DiagnosticSeverity.Error
                ),
                (diagnostic: Diagnostic) => {
                    diagnostic.source = 'PHPUnit';
                }
            );
        });
    }

    private convertToRange(test: TestCase, document?: TextDocument): Promise<Range> {
        return new Promise(resolve => {
            const line = test.line - 1;
            let start = 0;
            let end = 1000;

            if (document && document.uri && normalizePath(document.uri.fsPath) === normalizePath(test.file)) {
                const textLine: TextLine = document.lineAt(line);

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
