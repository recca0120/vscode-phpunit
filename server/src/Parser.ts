import _files from './Filesystem';
import {
    Range,
    TextDocument,
    CodeLens,
    Command,
} from 'vscode-languageserver-protocol';
import URI from 'vscode-uri';
import { PathLike } from 'fs';
import { default as Engine } from 'php-parser';

interface TestOptions {
    class?: string;
    namespace?: string;
    method?: string;
    uri: URI;
}

export interface Test extends TestOptions {
    depends: string[];
    kind: string;
    range: Range;
    asCodeLens(): CodeLens;
    asCommand(): Command;
    asArguments(): string[];
}

export interface TestSuite extends Test {
    children: Test[];
}

class NodeTest implements Test {
    constructor(private node: any, private options?: TestOptions) {}

    get class(): string {
        return this.options.class;
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

    get method(): string {
        return this.kind === 'method' ? this.node.name.name : '';
    }

    get namespace(): string {
        return this.options.namespace;
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
        codeLens.command = this.asCommand();

        return codeLens;
    }

    asCommand(): Command {
        return {
            title: 'Run Test',
            command: 'phpunit.lsp.test.nearest',
            arguments: [this.uri.toString(), this.range.start],
        };
    }

    asArguments(): string[] {
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

class NodeTestSuite extends NodeTest implements TestSuite {
    constructor(node: any, public children: Test[], options?: TestOptions) {
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
            .filter((method: NodeTest) => method.isTest());

        if (tests.length === 0) {
            return null;
        }

        return new NodeTestSuite(this.node, tests, options);
    }

    private asTest(node: any, testOptions: any, prev: any = null) {
        return new NodeTest(this.fixLeadingComments(node, prev), testOptions);
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

    async parse(uri: PathLike | URI): Promise<TestSuite[]> {
        return this.parseCode(await this.files.get(uri), uri);
    }

    parseTextDocument(textDocument: TextDocument | null): TestSuite[] {
        if (!textDocument) {
            return [];
        }

        return this.parseCode(textDocument.getText(), textDocument.uri);
    }

    parseCode(code: string, uri: PathLike | URI): TestSuite[] {
        const tree: any = this.engine.parseCode(code);

        return this.findClasses(this.files.asUri(uri), tree.children).reduce(
            (testSuites, clazz) => {
                const testSuite = clazz.asTestSuite();

                return testSuite ? testSuites.concat([testSuite]) : testSuites;
            },
            []
        );
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
