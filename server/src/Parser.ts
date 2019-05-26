/// <reference path="../types/php-parser.d.ts" />
import files from './Filesystem';
import URI from 'vscode-uri';
import { default as Engine } from 'php-parser';
import { PathLike } from 'fs';
import { TestInfo, TestSuiteInfo } from './TestExplorer';

import {
    Range,
    TextDocument,
    CodeLens,
    Command,
} from 'vscode-languageserver-protocol';

interface TestOptions {
    [propName: string]: any;
    class?: string;
    namespace?: string;
    method?: string;
    uri: URI;
}

interface ExportCodeLens {
    exportCodeLens(): CodeLens[];
}

abstract class BaseTestNode {
    [propName: string]: any;

    constructor(private node: any, private options?: TestOptions) {}

    get name(): string {
        return this.node.name.name;
    }

    get file(): string | undefined {
        return this.options && this.options.uri
            ? this.options.uri.toString()
            : undefined;
    }

    get line(): number {
        return this.node.loc.start.line - 1;
    }

    get depends(): string[] {
        const comments: any[] = this.node.body.leadingComments || [];

        return comments.reduce((depends: any[], comment: any) => {
            const matches = (comment.value.match(/@depends\s+[^\n\s]+/g) || [])
                .map((depend: string) => depend.replace('@depends', '').trim())
                .filter((depend: string) => !!depend);

            return depends.concat(matches);
        }, []);
    }

    get kind(): string {
        return this.node.kind;
    }

    get fullclass(): string {
        return [this.namespace, this.class].filter(name => !!name).join('\\');
    }

    get namespace(): string | undefined {
        return this.options ? this.options.namespace : undefined;
    }

    get class(): string | undefined {
        return this.options ? this.options.class : undefined;
    }

    get method(): string {
        return this.kind === 'method' ? this.node.name.name : '';
    }

    get range(): Range {
        const start = this.node.loc.start;
        const startCharacter = this.node.visibility
            ? start.column - this.node.visibility.length
            : start.column;

        const end = this.node.loc.end;

        return Range.create(
            start.line - 1,
            startCharacter,
            end.line - 1,
            end.column
        );
    }

    get uri(): URI | undefined {
        return this.options ? this.options.uri : undefined;
    }

    isTest(): boolean {
        return (
            this.acceptModifier() &&
            (this.acceptComments() || this.acceptMethodName())
        );
    }

    asCodeLens(): CodeLens {
        const codeLens = CodeLens.create(this.range);

        codeLens.command = {
            title: 'Run Test',
            command: 'phpunit.lsp.run-test-at-cursor',
            arguments: [this.id],
        } as Command;

        return codeLens;
    }

    private acceptModifier(): boolean {
        return (
            this.node.isStatic === false &&
            ['', 'public'].indexOf(this.node.visibility) !== -1
        );
    }

    private acceptComments(): boolean {
        const comments: any[] = this.node.body.leadingComments || [];

        return comments.some((comment: any) => /@test/.test(comment.value));
    }

    private acceptMethodName(): boolean {
        return /^test/.test(this.node.name.name);
    }
}

export class TestSuiteNode extends BaseTestNode
    implements TestSuiteInfo, ExportCodeLens {
    type!: 'suite';

    constructor(
        node: any,
        public children: (TestSuiteNode | TestNode)[],
        options?: TestOptions
    ) {
        super(node, options);
    }

    get id(): string {
        return this.fullclass;
    }

    get label(): string {
        return this.fullclass || '';
    }

    exportCodeLens(): CodeLens[] {
        return [this.asCodeLens()].concat(
            this.children.map(test => test.asCodeLens())
        );
    }
}

export class TestNode extends BaseTestNode implements TestInfo {
    type!: 'test';

    constructor(node: any, options?: TestOptions) {
        super(node, options);
    }

    get id(): string {
        return [this.fullclass, this.name].join('::');
    }

    get label(): string {
        return this.method;
    }
}

class Clazz {
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
    constructor(
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
    ) {}

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

    private findClasses(uri: URI, nodes: any[], namespace = ''): Clazz[] {
        return nodes.reduce((classes: any[], node: any) => {
            if (node.kind === 'namespace') {
                return classes.concat(
                    this.findClasses(uri, node.children, node.name)
                );
            }

            return this.isTestClass(node)
                ? classes.concat(new Clazz(node, { uri, namespace }))
                : classes;
        }, []);
    }

    private isTestClass(node: any): boolean {
        return node.kind === 'class' && !node.isAbstract;
    }
}
