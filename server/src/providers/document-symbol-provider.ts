import { PhpunitParser } from '../phpunit-parser';
import { SymbolInformation, TextDocument, SymbolKind, Range } from 'vscode-languageserver';

export class DocumentSymbolProvider {
    constructor(private phpunitParser = new PhpunitParser()) {}

    provideDocumentSymbols(textDocument: TextDocument): SymbolInformation[] {
        return this.convertToDocumentSymbol(this.phpunitParser.parseCode(textDocument.getText()), textDocument.uri);
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
