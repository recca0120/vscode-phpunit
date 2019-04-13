import { Filesystem } from './filesystem';
import { Position, Range } from 'vscode-languageserver-types';
import URI from 'vscode-uri';
import { PathLike } from 'fs';
import { default as Engine } from 'php-parser';

interface TestOptions {
    uri: URI;
    namespace?: string;
    class?: string;
}

interface ITest {
    class: string;
    depends: string[];
    method: string;
    namespace: string;
    range: Range;
    uri: URI;
}

class Test implements ITest {
    constructor(private node: any, private options?: TestOptions) {}
    get class(): string {
        return this.options.class;
    }
    get depends(): string[] {
        const comments: any[] = this.node.body.leadingComments || [];
        return comments.reduce((depends: any[], comment: any) => {
            const matches = comment.value.match(/@depends\s+[^\n\s]+/g);
            return !matches
                ? depends
                : depends
                      .concat(
                          matches.map((depend: string) =>
                              depend.replace('@depends', '').trim()
                          )
                      )
                      .filter(depend => !!depend);
        }, []);
    }
    get method(): string {
        return this.node.kind === 'method' ? this.node.name.name : '';
    }
    get namespace(): string {
        return this.options.namespace;
    }
    get range(): Range {
        return {
            start: this.asPosition(true),
            end: this.asPosition(false),
        };
    }
    get uri(): URI {
        return this.options.uri;
    }
    isTest(): Boolean {
        return (
            this.acceptModifier() &&
            (this.acceptComments() || this.acceptMethodName())
        );
    }
    private acceptModifier(): Boolean {
        return (
            this.node.isStatic === false &&
            ['', 'public'].indexOf(this.node.visibility) !== -1
        );
    }
    private acceptComments(): Boolean {
        const comments: any[] = this.node.body.leadingComments || [];
        return comments.some((comment: any) => /@test/.test(comment.value));
    }
    private acceptMethodName(): Boolean {
        return /^test/.test(this.node.name.name);
    }
    private asPosition(start = true): Position {
        const position = start ? this.node.loc.start : this.node.loc.end;
        const character =
            this.node.visibility && start === true
                ? position.column - this.node.visibility.length
                : position.column;
        return Position.create(position.line - 1, character);
    }
}
class Clazz {
    constructor(private node: any, private options: TestOptions) {}
    tests(): Test[] {
        let tests = this.node.body
            .map((node: any, index: number) => this.asTest(node, index))
            .filter((method: Test) => method.isTest());

        return tests.length > 0
            ? (tests = [this.asTest(this.node)].concat(tests))
            : tests;
    }
    private asTest(node: any, index: number | null = null) {
        if (index !== null && index !== 0) {
            const prev = this.node.body[index - 1];
            if (prev && prev.body && prev.body.trailingComments) {
                node.body.leadingComments = prev.body.trailingComments;
            }
        }
        return new Test(
            node,
            Object.assign({ class: this.node.name.name }, this.options)
        );
    }
}
export class PHPUnitParser {
    constructor(
        private files = new Filesystem(),
        private engine = Engine.create({
            ast: {
                withPositions: true,
                withSource: true,
            },
            parser: {
                php7: true,
                debug: false,
                extractDoc: true,
                extractTokens: true,
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
    parseCode(code: string, uri: PathLike | URI): Test[] {
        const tree: any = this.engine.parseCode(code);
        if (!tree || !tree.children) {
            return [];
        }
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
    private isTestClass(node: any): Boolean {
        return node.kind !== 'class' || node.isAbstract ? false : true;
    }
}
