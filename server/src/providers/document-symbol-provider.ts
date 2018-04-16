import { Runner } from '../runner';
import { SymbolInformation, SymbolKind, TextDocument } from 'vscode-languageserver-types';
import { TestNode } from '../phpunit';

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
