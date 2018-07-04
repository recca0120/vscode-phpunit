import { TestSuite } from './phpunit/test-suite';
import { Method } from './phpunit/common';
import { SymbolInformation, SymbolKind } from 'vscode-languageserver-protocol';

export class DocumentSymbolProvider {
    constructor(private testSuite: TestSuite = new TestSuite()) {}

    async formText(text: string, uri: string): Promise<SymbolInformation[]> {
        const methods: Method[] = await this.testSuite.parse(text, uri);

        return methods.map(
            (method: Method): SymbolInformation => {
                return SymbolInformation.create(
                    method.name,
                    method.kind === 'class' ? SymbolKind.Class : SymbolKind.Method,
                    method.range,
                    uri,
                    method.namespace
                );
            }
        );
    }
}
