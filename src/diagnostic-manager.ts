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
import { Fault, TestCase, Type } from './parsers/parser';
import { normalizePath, tap } from './helpers';

import { Store } from './store';

export class DiagnosticManager {
    constructor(private diagnostics: DiagnosticCollection) {}

    handle(store: Store, editors: TextEditor[]) {
        this.diagnostics.clear();

        const details = store
            .getDetails()
            .filter((item: TestCase) => item.type !== Type.PASSED)
            .groupBy('key');

        editors.forEach((editor: TextEditor) => {
            const file = editor.document.uri.fsPath;
            const key = normalizePath(file);

            if (details.has(key)) {
                const promises: Promise<Diagnostic>[] = details
                    .get(key)
                    .values()
                    .map((item: TestCase) => this.convertToDiagnostic(item, editor.document));
                Promise.all(promises).then((diagnostics: Diagnostic[]) => {
                    this.diagnostics.set(Uri.file(file), diagnostics.filter(diagnostic => diagnostic !== null));
                });
            }
        });
    }

    private convertToDiagnostic(item: TestCase, document?: TextDocument): Promise<Diagnostic> {
        return this.convertToRange(item, document).then((range: Range) => {
            return tap(
                new Diagnostic(
                    range,
                    (item.fault as Fault).message,
                    item.type === Type.ERROR ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
                ),
                (diagnostic: Diagnostic) => {
                    diagnostic.source = 'PHPUnit';
                }
            );
        });
    }

    private convertToRange(item: TestCase, document?: TextDocument): Promise<Range> {
        return new Promise(resolve => {
            const line = item.line - 1;
            let start = 0;
            let end = 1000;

            if (document && document.uri && normalizePath(document.uri.fsPath) === normalizePath(item.file)) {
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
