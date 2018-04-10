import { Testsuite, TestNode } from '../phpunit';
import { SymbolInformation, TextDocument, SymbolKind } from 'vscode-languageserver';

export class DocumentSymbolProvider {
    constructor(private testsuite = new Testsuite()) {}

    provideDocumentSymbols(textDocument: TextDocument): SymbolInformation[] {
        return this.convertToDocumentSymbol(
            this.testsuite.parseAst(textDocument.getText(), textDocument.uri),
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
