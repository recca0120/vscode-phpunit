import { Ast, Collection, PhpUnit, TestNode, Test } from './phpunit';
import { CodeLens, Diagnostic, TextDocument, Command } from 'vscode-languageserver-types';
import { Filesystem, FilesystemContract } from './filesystem';
import { IConnection } from 'vscode-languageserver';
import { tap, when } from './helpers';
import { TextlineRange } from './phpunit/textline-range';

interface LastCommand {
    path: string;
    params: string[];
}

export class Runner {
    private lastCommand: LastCommand | undefined = undefined;

    constructor(
        private phpUnit: PhpUnit = new PhpUnit(),
        private collect: Collection = new Collection(),
        private ast: Ast = new Ast(),
        private files: FilesystemContract = new Filesystem(),
        private textlineRange: TextlineRange = new TextlineRange()
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

    async run(connection: IConnection, uri: string, path: string, params: string[] = []): Promise<Runner> {
        this.phpUnit.onRunning((command: Command) => {
            this.lastCommand = {
                path,
                params,
            };
            connection.sendNotification('running', command);
        });

        this.phpUnit.onDone((output: string, tests: Test[]) => {
            this.collect.put(tests);
            connection.console.log(output);
            connection.sendNotification('done');
            this.sendDiagnostics(connection).sendNotification(connection, uri);
        });

        return tap(this, async () => await this.phpUnit.run(path, params));
    }

    async runNearest(connection: IConnection, uri: string, path: string, params: string[] = []) {
        const filter: string[] = this.getMethodFilter(
            await this.textlineRange.findMethod(path, parseInt(params[0], 10))
        );

        return tap(await this.run(connection, uri, path, filter), () => this.textlineRange.clear());
    }

    async runLast(connection: IConnection, uri: string, path: string, params: string[] = []) {
        if (this.lastCommand) {
            path = this.lastCommand.path;
            params = this.lastCommand.params;
        }

        return await this.run(connection, uri, path, params);
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
                        command: 'phpunit.test',
                        arguments: [uri, this.files.normalizePath(node.uri), this.getMethodFilter(node.name)],
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

    private getMethodFilter(method: string): string[] {
        return method ? ['--filter', `^.*::${method}$`] : [];
    }
}
