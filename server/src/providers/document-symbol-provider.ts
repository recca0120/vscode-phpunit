import { Testsuite } from '../phpunit';
import { SymbolInformation, TextDocument, SymbolKind, Range } from 'vscode-languageserver';

export class DocumentSymbolProvider {
    constructor(private testsuite = new Testsuite()) {}

    provideDocumentSymbols(textDocument: TextDocument): SymbolInformation[] {
        return this.convertToDocumentSymbol(this.testsuite.parseAst(textDocument.getText()), textDocument.uri);
    }

    protected convertToDocumentSymbol(nodes: any, uri: string): SymbolInformation[] {
        return nodes.map((node: any) => {
            const { start } = node.loc;

            return SymbolInformation.create(
                node.name,
                node.kind === 'class' ? SymbolKind.Class : SymbolKind.Method,
                Range.create(start.line - 1, start.column, start.line - 1, start.column + node.name.length),
                uri
            );
        });
    }
}
