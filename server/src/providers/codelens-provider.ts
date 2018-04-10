import { Testsuite, TestNode } from '../phpunit';
import { CodeLens, TextDocument, Command } from 'vscode-languageserver';

export class CodeLensProvider {
    constructor(private testsuite = new Testsuite()) {}

    provideCodeLenses(textDocument: TextDocument): CodeLens[] {
        return this.convertToCodeLens(this.testsuite.parseAst(textDocument.getText(), textDocument.uri), {
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
            let command: Command = {
                title: 'Run Test',
                command: '',
            };
            if (node.class === node.name) {
                Object.assign(command, {
                    command: 'phpunit.test.file',
                    arguments: [data.textDocument.uri],
                });
            } else {
                Object.assign(command, {
                    command: 'phpunit.test.method',
                    arguments: [data.textDocument.uri, '--filter', `^.*::${node.name}$`],
                });
            }

            return {
                range: node.range,
                command,
                data,
            };
        });
    }
}
