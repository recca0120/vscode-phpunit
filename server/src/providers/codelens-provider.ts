import { Testsuite, TestNode } from '../phpunit';
import { CodeLens, TextDocument } from 'vscode-languageserver';
import { when } from '../helpers';

export class CodeLensProvider {
    constructor(private testsuite = new Testsuite()) {}

    provideCodeLenses(textDocument: TextDocument): CodeLens[] {
        return this.convertToCodeLens(this.testsuite.getTestNodes(textDocument.getText(), textDocument.uri), {
            textDocument: {
                uri: textDocument.uri,
            },
        });
    }

    resolveCodeLens(codeLens: CodeLens): Promise<CodeLens> {
        return new Promise(resolve => {
            resolve(codeLens);
        });
    }

    private convertToCodeLens(nodes: TestNode[], data: any = {}): CodeLens[] {
        return nodes.map((node: TestNode) => {
            return {
                data,
                range: node.range,
                command: when(
                    node.class === node.name,
                    () => {
                        return {
                            title: 'Run Test',
                            command: 'phpunit.test.file',
                            arguments: [data.textDocument.uri],
                        };
                    },
                    () => {
                        return {
                            title: 'Run Test',
                            command: 'phpunit.test.method',
                            arguments: [data.textDocument.uri, '--filter', `^.*::${node.name}$`],
                        };
                    }
                ),
            };
        });
    }
}
