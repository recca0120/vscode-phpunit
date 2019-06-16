/// <reference path="../types/php-parser.d.ts" />
import Engine from 'php-parser';
import files from './Filesystem';
import URI from 'vscode-uri';
import { PathLike } from 'fs';
import { TestNode, TestOptions, TestSuiteNode } from './TestNode';
import { TextDocument } from 'vscode-languageserver';

class ClassNode {
    constructor(private node: any, private options: TestOptions) {}

    asTestSuite(): TestSuiteNode | null {
        const options = this.getTestOptions();
        const methods = this.getMethods();

        const tests = methods
            .map((node: any) => this.asTest(node, options))
            .filter((method: TestNode) => method.isTest());

        if (tests.length === 0) {
            return null;
        }

        return new TestSuiteNode(this.node, tests, options);
    }

    private asTest(node: any, testOptions: any) {
        return new TestNode(node, testOptions);
    }

    private fixLeadingComments(node: any, prev: any) {
        if (!node.body) {
            node.body = {
                leadingComments: '',
            };
        }

        if (node.leadingComments) {
            node.body.leadingComments = node.leadingComments;

            return node;
        }

        if (node.body.leadingComments || !prev) {
            return node;
        }

        if (prev.trailingComments) {
            node.body.leadingComments = prev.trailingComments;

            return node;
        }

        if (prev.body && prev.body.trailingComments) {
            node.body.leadingComments = prev.body.trailingComments;

            return node;
        }

        return node;
    }

    private getMethods() {
        return this.node.body
            .map((node: any, index: number, childrens: any[]) => {
                return this.fixLeadingComments(
                    node,
                    index === 0 ? this.node : childrens[index - 1]
                );
            })
            .filter((node: any) => node.kind === 'method');
    }

    private getTestOptions() {
        return Object.assign({ class: this.node.name.name }, this.options);
    }
}

export default class Parser {
    private workspaceFolder: string = '';
    constructor(
        workspaceFolder = process.cwd(),
        private engine = Engine.create({
            ast: {
                withPositions: true,
                withSource: true,
            },
            parser: {
                php7: true,
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
        }),
        private _files = files
    ) {
        this.workspaceFolder = this._files.asUri(workspaceFolder).toString();
    }

    async parse(uri: PathLike | URI): Promise<TestSuiteNode | null> {
        return this.parseCode(await this._files.get(uri), uri);
    }

    parseTextDocument(textDocument: TextDocument | null): TestSuiteNode | null {
        if (!textDocument) {
            return null;
        }

        return this.parseCode(textDocument.getText(), textDocument.uri);
    }

    parseCode(code: string, uri: PathLike | URI): TestSuiteNode | null {
        const tree: any = this.engine.parseCode(code);
        const classes = this.findClasses(this._files.asUri(uri), tree.children);

        return !classes || classes.length === 0
            ? null
            : classes[0].asTestSuite();
    }

    private findClasses(uri: URI, nodes: any[], namespace = ''): ClassNode[] {
        return nodes.reduce((classes: any[], node: any) => {
            if (node.kind === 'namespace') {
                return classes.concat(
                    this.findClasses(uri, node.children, node.name)
                );
            }

            return this.isTestClass(node)
                ? classes.concat(
                      new ClassNode(node, {
                          workspaceFolder: this.workspaceFolder,
                          uri,
                          namespace,
                      })
                  )
                : classes;
        }, []);
    }

    private isTestClass(node: any): boolean {
        return node.kind === 'class' && !node.isAbstract;
    }
}
