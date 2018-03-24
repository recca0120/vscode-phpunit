import { Block, Node, Program } from 'php-parser';
import { CodeLens, Range, TextDocument, Command } from 'vscode-languageserver';

import Engine from 'php-parser';

const parser: Engine = new Engine({
    ast: {
        withPositions: true,
        withSource: true,
    },
    parser: {
        debug: false,
        extractDoc: true,
        suppressErrors: true,
    },
    lexer: {
        all_tokens: true,
        comment_tokens: true,
        mode_eval: true,
        asp_tags: true,
        short_tags: true,
    },
});

export class CodeLensProvider {
    provideCodeLenses(textDocument: TextDocument): CodeLens[] {
        return this.convertToCodeLens(this.parseCode(textDocument.getText()), {
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

    private convertToCodeLens(phpNode: Block, data: any = {}): CodeLens[] {
        return phpNode.children
            .filter(this.isTest.bind(this))
            .reduce((codeLens: Node[], classNode: any) => {
                const methods: any[] = classNode.body.filter(this.isTest.bind(this));

                return methods.length === 0 ? codeLens : codeLens.concat([classNode]).concat(methods);
            }, [])
            .map((node: any) => {
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

                return {
                    range: Range.create(
                        node.loc.start.line - 1,
                        node.loc.start.column,
                        node.loc.start.line - 1,
                        node.loc.start.column
                    ),
                    command,
                    data,
                };
            });
    }

    private parseCode(code: string): Program {
        return parser.parseCode(code);
    }

    private isTest(node: any): boolean {
        if (node.isAbstract === true) {
            return false;
        }

        if (node.kind === 'class') {
            return true;
        }

        return this.isTestMethod(node) === true;
    }

    private isTestMethod(node: any): boolean {
        return (
            node.kind === 'method' &&
            // /markTest(Skipped|Incomplete)/.test(node.body.loc.source) === false &&
            (/^test/.test(node.name) === true ||
                (node.leadingComments &&
                    node.leadingComments.some((comment: any) => /@test/.test(comment.value)) === true))
        );
    }
}
