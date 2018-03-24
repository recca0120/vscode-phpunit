import { Block, Node, Program } from 'php-parser';
import { CodeLens, Range, TextDocument } from 'vscode-languageserver';

import Engine from 'php-parser';

const parser = new Engine({
    ast: {
        withPositions: true,
        withSource: false,
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
                return codeLens.concat([classNode]).concat(classNode.body.filter(this.isTest.bind(this)));
            }, [])
            .map((node: any) => {
                return {
                    range: Range.create(
                        node.loc.start.line - 1,
                        node.loc.start.column,
                        node.loc.start.line - 1,
                        node.loc.start.column
                    ),
                    command: {
                        title: 'Run Test',
                        command: 'a',
                        tooltip: 'Run Test',
                    },
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

        if (this.isTestMethod(node)) {
            return true;
        }

        return false;
    }

    private isTestMethod(node: any): boolean {
        return (
            node.kind === 'method' &&
            (/^test/.test(node.name) === true ||
                (node.leadingComments &&
                    node.leadingComments.some((comment: any) => /@test/.test(comment.value)) === true))
        );
    }
}
