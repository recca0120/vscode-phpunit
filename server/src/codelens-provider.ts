import { PhpunitParser } from './phpunit-parser';
import { CodeLens, Range, TextDocument, Command } from 'vscode-languageserver';

export class CodeLensProvider {
    constructor(private phpunitParser = new PhpunitParser()) {}

    provideCodeLenses(textDocument: TextDocument): CodeLens[] {
        return this.convertToCodeLens(this.phpunitParser.parseCode(textDocument.getText()), {
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

    private convertToCodeLens(nodes: any, data: any = {}): CodeLens[] {
        return nodes.map((node: any) => {
            let command: Command;

            switch (node.kind) {
                case 'class':
                    command = {
                        title: 'Run Test',
                        command: 'phpunit.test.file',
                        arguments: [data.textDocument.uri],
                    };
                    break;
                case 'method':
                    command = {
                        title: 'Run Test',
                        command: 'phpunit.test.cursor',
                        arguments: [data.textDocument.uri, '--filter', `^.*::${node.name}$`],
                    };
                    break;
            }

            const { start } = node.loc;

            return {
                range: Range.create(start.line - 1, start.column, start.line - 1, start.column + node.name.length),
                command,
                data,
            };
        });
    }
}
