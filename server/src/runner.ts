import { PhpUnit, Ast, TestNode, Collection } from './phpunit';
import { tap, when } from './helpers';
import { IConnection, Diagnostic, CodeLens, TextDocument } from 'vscode-languageserver/lib/main';
import { FilesystemContract, Filesystem } from './filesystem';

export class Runner {
    constructor(
        private phpUnit: PhpUnit = new PhpUnit(),
        private collect: Collection = new Collection(),
        private ast: Ast = new Ast(),
        private files: FilesystemContract = new Filesystem()
    ) {}

    setBinary(binary: string): Runner {
        return tap(this, () => {
            this.phpUnit.setBinary(binary);
        });
    }

    setDefault(args: string[]): Runner {
        return tap(this, () => {
            this.phpUnit.setDefault(args);
        });
    }

    async run(path: string, params: string[] = []): Promise<string> {
        await this.phpUnit.run(path, params);
        this.collect.put(this.phpUnit.getTests());

        return this.phpUnit.getOutput();
    }

    getTestNodes(code: string, uri: string): TestNode[] {
        return this.ast.parse(code, this.files.uri(uri));
    }

    sendDiagnostics(connection: IConnection): Runner {
        return tap(this, () => {
            this.collect.getDiagnoics().forEach((diagnostics: Diagnostic[], uri: string) => {
                connection.sendDiagnostics({
                    uri,
                    diagnostics,
                });
            });
        });
    }

    sendNotification(connection: IConnection, pathOrUri: string): Runner {
        return tap(this, () => {
            const uri: string = this.files.uri(pathOrUri);
            connection.sendNotification('assertions', {
                uri: uri,
                assertions: this.collect.getAssertions().get(uri) || [],
            });
        });
    }

    getCodeLens(textDocument: TextDocument): CodeLens[] {
        const uri: string = textDocument.uri;
        const testNodes: TestNode[] = this.getTestNodes(textDocument.getText(), uri);

        return testNodes
            .concat(
                this.collect.getTestNodes(uri).filter((testNode: TestNode) => {
                    for (const node of testNodes) {
                        if (node.uri === testNode.uri && testNode.range === testNode.range) {
                            return false;
                        }
                    }

                    return true;
                })
            )
            .map((node: TestNode) => this.transformTestNodeToCodeLen(node, uri));
    }

    private transformTestNodeToCodeLen(node: TestNode, uri: string) {
        return {
            range: node.range,
            command: when(
                node.class === node.name,
                () => {
                    return {
                        title: 'Run Test',
                        command: 'phpunit.test.file',
                        arguments: [uri, this.files.normalizePath(node.uri), []],
                    };
                },
                () => {
                    return {
                        title: 'Run Test',
                        command: 'phpunit.test.method',
                        arguments: [uri, this.files.normalizePath(node.uri), ['--filter', `^.*::${node.name}$`]],
                    };
                }
            ),
            data: {
                textDocument: {
                    uri: uri,
                },
            },
        };
    }
}
