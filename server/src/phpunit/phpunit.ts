import { Ast } from './ast';
import { Cli } from './cli';
import { CodeLens, Diagnostic, SymbolInformation, SymbolKind } from 'vscode-languageserver-types';
import { Collection } from './collection';
import { Filesystem, FilesystemContract } from './../filesystem';
import { tap, when } from '../helpers';
import { TestNode, Assertion, Test, Type } from './common';
import { TextlineRange } from './textline-range';

interface LastCommand {
    path: string;
    params: string[];
}

interface State {
    failed: number;
    warning: number;
    passed: number;
}

export class PhpUnit {
    private output: string = '';
    private lastCommand: LastCommand = {
        path: '',
        params: [],
    };

    constructor(
        private cli: Cli = new Cli(),
        private collect: Collection = new Collection(),
        private ast: Ast = new Ast(),
        private files: FilesystemContract = new Filesystem(),
        private textlineRange: TextlineRange = new TextlineRange()
    ) {
        this.cli.on('done', (output: string, tests: Test[], path: string, params: string[]) => {
            this.output = output;
            if (tests.length > 0) {
                this.collect.put(tests);
                this.lastCommand = { path, params };
            }
        });
    }

    setBinary(binary: string): PhpUnit {
        return tap(this, () => {
            this.cli.setBinary(binary);
        });
    }

    setDefault(args: string[]): PhpUnit {
        return tap(this, () => {
            this.cli.setDefault(args);
        });
    }

    getTestNodes(code: string, uri: string): TestNode[] {
        return this.ast.parse(code, this.files.uri(uri));
    }

    getCodeLens(code: string, uri: string): CodeLens[] {
        const testNodes: TestNode[] = this.getTestNodes(code, uri);

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
            .map((node: TestNode) => this.asCodeLen(node, uri));
    }

    getDiagnoics(): Map<string, Diagnostic[]> {
        return this.collect.getDiagnoics();
    }

    getAssertions(uri: string): Assertion[] {
        return this.collect.getAssertions().get(uri) || [];
    }

    getDocumentSymbols(code: string, uri: string): SymbolInformation[] {
        return this.getTestNodes(code, uri).map((node: TestNode) => this.asDocumentSymbol(node, uri));
    }

    getState(): State {
        const state: State = {
            failed: 0,
            warning: 0,
            passed: 0,
        };

        this.collect.forEach((tests: Test[]) => {
            tests.forEach((test: Test) => {
                if ([Type.ERROR, Type.FAILURE, Type.FAILED].indexOf(test.type) !== -1) {
                    state.failed++;
                } else if ([Type.INCOMPLETE, Type.RISKY, Type.SKIPPED].indexOf(test.type) !== -1) {
                    state.warning++;
                } else {
                    state.passed++;
                }
            });
        });

        return state;
    }

    getOutput(): string {
        return this.output;
    }

    async run(path: string, params: string[]): Promise<PhpUnit> {
        await this.cli.run(path, params);

        return this;
    }

    async runLast(path: string = '', params: string[] = []): Promise<PhpUnit> {
        path = this.lastCommand.path || path;
        params = this.lastCommand.params || params;

        return await this.run(path, params);
    }

    async runNearest(path: string, params: string[] = []): Promise<PhpUnit> {
        return tap(
            await this.run(
                path,
                this.asMethodFilter(await this.textlineRange.findMethod(path, parseInt(params[0], 10)))
            ),
            () => this.textlineRange.clear()
        );
    }

    private asCodeLen(node: TestNode, uri: string) {
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
                        arguments: [uri, this.files.normalizePath(node.uri), this.asMethodFilter(node.name)],
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

    private asMethodFilter(method: string): string[] {
        return method ? ['--filter', `^.*::${method}( with data set .*)?$`] : [];
    }

    private asDocumentSymbol(node: TestNode, uri: string): SymbolInformation {
        return SymbolInformation.create(
            node.name.replace(/.*\\/g, ''),
            node.class === node.name ? SymbolKind.Class : SymbolKind.Method,
            node.range,
            uri
        );
    }
}
