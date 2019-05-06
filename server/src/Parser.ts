/// <reference path="../types/php-parser.d.ts" />

import _files from './Filesystem';
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

abstract class BaseTest {
    [propName: string]: any;

    constructor(private node: any, private options?: TestOptions) {}

    get id(): string {
        return this.kind === 'method'
            ? [this.fullclass, this.node.name.name].join('::')
            : this.fullclass;
    }

    get label(): string {
        return this.kind === 'method' ? this.method : this.class;
    }

    get file(): string {
        return this.options.uri.toString();
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

    get namespace(): string {
        return this.options.namespace;
    }

    get class(): string {
        return this.options.class;
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

    get uri(): URI {
        return this.options.uri;
    }

    isTest(): boolean {
        return (
            this.acceptModifier() &&
            (this.acceptComments() || this.acceptMethodName())
        );
    }

    asCodeLens(): CodeLens {
        const codeLens = CodeLens.create(this.range);
        codeLens.command = this.asCodeLensCommand();
        codeLens.data = {
            type: this instanceof TestSuite ? 'suite' : 'test',
            range: this.range,
            arguments: this.asCommandArguments(),
        };

        return codeLens;
    }

    asCodeLensCommand(): Command {
        return {
            title: 'Run Test',
            command: 'phpunit.lsp.run-test-at-cursor',
            arguments: [this.uri.toString(), this.range.start],
        };
    }

    private asCommandArguments(): string[] {
        const args = [this.uri.fsPath];

        if (!this.method) {
            return args;
        }

        const depends = this.depends.concat(this.method).join('|');

        return args.concat([
            '--filter',
            `^.*::(${depends})( with data set .*)?$`,
        ]);
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

export class TestSuite extends BaseTest
    implements TestSuiteInfo, ExportCodeLens {
    type: 'suite';

    constructor(
        node: any,
        public children: (TestSuite | Test)[],
        options?: TestOptions
    ) {
        super(node, options);
    }

    exportCodeLens(): CodeLens[] {
        return [this.asCodeLens()].concat(
            this.children.map(test => test.asCodeLens())
        );
    }
}

export class Test extends BaseTest implements TestInfo {
    type: 'test';

    constructor(node: any, options?: TestOptions) {
        super(node, options);
    }
}

class Clazz {
    constructor(private node: any, private options: TestOptions) {}

    asTestSuite(): TestSuite {
        const options = this.getTestOptions();
        const methods = this.getMethods();

        const tests = methods
            .map((node: any, index: number) =>
                this.asTest(node, options, methods[index - 1])
            )
            .filter((method: Test) => method.isTest());

        if (tests.length === 0) {
            return null;
        }

        return new TestSuite(this.node, tests, options);
    }

    private asTest(node: any, testOptions: any, prev: any = null) {
        return new Test(this.fixLeadingComments(node, prev), testOptions);
    }

    private fixLeadingComments(node: any, prev: any) {
        if (prev && prev.body && prev.body.trailingComments) {
            node.body.leadingComments = prev.body.trailingComments;
        }

        if (node.body && node.leadingComments) {
            node.body.leadingComments = node.leadingComments;
        }

        return node;
    }

    private getMethods() {
        return this.node.body.filter((node: any) => node.kind === 'method');
    }

    private getTestOptions() {
        return Object.assign({ class: this.node.name.name }, this.options);
    }
}

export default class Parser {
    constructor(
        private files = _files,
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
        })
    ) {}

    async parse(uri: PathLike | URI): Promise<TestSuite | null> {
        return this.parseCode(await this.files.get(uri), uri);
    }

    parseTextDocument(textDocument: TextDocument | null): TestSuite | null {
        if (!textDocument) {
            return undefined;
        }

        return this.parseCode(textDocument.getText(), textDocument.uri);
    }

    parseCode(code: string, uri: PathLike | URI): TestSuite | null {
        const tree: any = this.engine.parseCode(code);
        const classes = this.findClasses(this.files.asUri(uri), tree.children);

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
