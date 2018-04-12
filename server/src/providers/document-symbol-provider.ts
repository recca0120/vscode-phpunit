import { TestNode } from '../phpunit';
import { SymbolInformation, TextDocument, SymbolKind } from 'vscode-languageserver';
import { Runner } from '../runner';

export class DocumentSymbolProvider {
    constructor(private runner = new Runner()) {}

    provideDocumentSymbols(textDocument: TextDocument): SymbolInformation[] {
        return this.convertToDocumentSymbol(
            this.runner.getTestNodes(textDocument.getText(), textDocument.uri),
            textDocument.uri
        );
    }

    protected convertToDocumentSymbol(nodes: TestNode[], uri: string): SymbolInformation[] {
        return nodes.map((node: any) => {
            return SymbolInformation.create(
                node.name.replace(/.*\\/g, ''),
                node.class === node.name ? SymbolKind.Class : SymbolKind.Method,
                node.range,
                uri
            );
        });
    }
}
