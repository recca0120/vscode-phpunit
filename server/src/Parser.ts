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
    uri: URI;
}

export interface Test {
    class: string;
    depends: string[];
    kind: string;
    method: string;
    namespace: string;
    range: Range;
    uri: URI;
    asCodeLens(): CodeLens;
    asCommand(): Command;
    asArguments(): string[];
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
            this.node.kind === 'method' &&
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
        return true;
        const comments: any[] = this.node.body.leadingComments || [];

        return comments.some((comment: any) => /@test/.test(comment.value));
    }

    private acceptMethodName(): boolean {
        return /^test/.test(this.node.name.name);
    }
}

class Clazz {
    constructor(private node: any, private options: TestOptions) {}

    tests(): Test[] {
        const methods = this.node.body.filter(
            (node: any) => node.kind === 'method'
        );

        const tests = methods
            .map((node: any, index: number) =>
                this.asTest(node, index === 0 ? null : methods[index - 1])
            )
            .filter((method: NodeTest) => method.isTest());

        return tests.length > 0
            ? [this.asTest(this.node)].concat(tests)
            : tests;
    }

    private asTest(node: any, prev: any = null) {
        return new NodeTest(
            this.fixLeadingComments(node, prev),
            Object.assign({ class: this.node.name.name }, this.options)
        );
    }

    private fixLeadingComments(node: any, prev: any) {
        return node;
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

    async parse(uri: PathLike | URI): Promise<Test[]> {
        return this.parseCode(await this.files.get(uri), uri);
    }

    parseTextDocument(textDocument: TextDocument | null): Test[] {
        if (!textDocument) {
            return [];
        }

        return this.parseCode(textDocument.getText(), textDocument.uri);
    }

    parseCode(code: string, uri: PathLike | URI): Test[] {
        const tree: any = this.engine.parseCode(code);

        return this.findClasses(this.files.asUri(uri), tree.children).reduce(
            (methods, clazz) => methods.concat(clazz.tests()),
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
