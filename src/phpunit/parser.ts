import { Class, Declaration, Engine, Method, Namespace, Node, Program, UseGroup } from 'php-parser';

const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { extractDoc: true, suppressErrors: false },
    lexer: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        all_tokens: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        short_tags: true,
    },
});

type Attribute = {
    id: string;
    qualifiedClass: string;
    namespace: string;
    class: string;
    method?: string;
    start: Position;
    end: Position;
    annotations: Annotations;
};

type Annotations = {
    depends?: string[];
    dataProvider?: string[];
};

type Position = {
    character: number;
    line: number;
};

const getName = (ast: Namespace | Class | Declaration) => {
    return typeof ast.name === 'string' ? ast.name : ast.name.name;
};

class AnnotationParser {
    private readonly lookup = ['depends', 'dataProvider'];
    private readonly template = (annotation: string) =>
        `@${annotation}\\s+(?<${annotation}>[^\\n\\s]+)`;

    private readonly pattern: RegExp = new RegExp(
        this.lookup.map((name) => this.template(name)).join('|'),
        'g'
    );

    public parse(declaration: Declaration): Annotations {
        const comments = declaration.leadingComments ?? [];

        return comments
            .map((comment) => comment.value.matchAll(this.pattern))
            .reduce((result, matches) => this.append(result, matches), {} as Annotations);
    }

    private append(annotations: Annotations | any, matches: IterableIterator<RegExpMatchArray>) {
        for (let match of matches) {
            const groups = match!.groups;
            for (const property in groups) {
                const value = groups[property];
                if (value) {
                    annotations[property] = [...(annotations[property] ?? []), value];
                }
            }
        }

        return annotations;
    }
}

export class AttributeParser {
    private static readonly parser = new AnnotationParser();

    private readonly lookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClass,
        method: this.parseMethod,
    };

    private get parser() {
        return AttributeParser.parser;
    }

    public uniqueId(namespace?: string, _class?: string, method?: string) {
        if (!_class) {
            return namespace;
        }

        let uniqueId = this.qualifiedClass(namespace, _class);
        if (method) {
            uniqueId = `${uniqueId}::${method}`;
        }

        return uniqueId;
    }

    public qualifiedClass(namespace?: string, _class?: string) {
        return [namespace, _class].filter((name) => !!name).join('\\');
    }

    public parse(declaration: Declaration, namespace?: Namespace, _class?: Class): Attribute {
        const fn = this.lookup[declaration.kind];
        const parsed = fn.apply(this, [declaration, namespace, _class]);
        const annotations = this.parser.parse(declaration);
        const { start, end } = this.parsePosition(declaration);
        const id = this.uniqueId(parsed.namespace, parsed.class, parsed.method);
        const qualifiedClass = this.qualifiedClass(parsed.namespace, parsed.class);

        return {
            id,
            qualifiedClass,
            ...parsed,
            start,
            end,
            annotations,
        };
    }

    private parseNamespace(declaration: Declaration) {
        return { namespace: this.parseName(declaration) };
    }

    private parseClass(declaration: Declaration, namespace?: Namespace) {
        return { namespace: this.parseName(namespace), class: this.parseName(declaration) };
    }

    private parseMethod(declaration: Declaration, namespace?: Namespace, _class?: Class) {
        return {
            namespace: this.parseName(namespace),
            class: this.parseName(_class),
            method: this.parseName(declaration),
        };
    }

    private parsePosition(declaration: Declaration) {
        const loc = declaration.loc!;
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.start.line, character: loc.source?.length ?? 0 };

        return { start, end };
    }

    private parseName(declaration?: Namespace | Class | Declaration) {
        return declaration ? getName(declaration) : undefined;
    }
}

class Validator {
    private lookup: { [p: string]: Function } = {
        class: this.validateClass,
        method: this.validateMethod,
    };

    public isTest(declaration: Declaration) {
        const fn = this.lookup[declaration.kind];

        return fn ? fn.apply(this, [declaration]) : false;
    }

    private validateClass(declaration: Declaration) {
        return !this.isAbstract(declaration as Class);
    }

    private validateMethod(declaration: Declaration) {
        const method = declaration as Method;

        if (this.isAbstract(method) || !this.acceptModifier(method)) {
            return false;
        }

        return this.isAnnotationTest(method) || getName(method).startsWith('test');
    }

    private isAbstract(declaration: Class | Method) {
        return declaration.isAbstract;
    }

    private isAnnotationTest(declaration: Declaration) {
        return !declaration.leadingComments
            ? false
            : new RegExp('@test').test(
                  declaration.leadingComments.map((comment) => comment.value).join('\n')
              );
    }

    private acceptModifier(declaration: Method) {
        return ['', 'public'].indexOf(declaration.visibility) !== -1;
    }
}

class Parser {
    private static readonly validator = new Validator();
    private static readonly attributeParser = new AttributeParser();

    private namespace?: Namespace;
    private lookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClass,
    };

    public parse(text: Buffer | string, fsPath: string): TestSuite[] | undefined {
        text = text.toString();

        // Todo https://github.com/glayzzle/php-parser/issues/170
        text = text.replace(/\?>\r?\n<\?/g, '?>\n___PSEUDO_INLINE_PLACEHOLDER___<?');

        const ast = engine.parseCode(text, fsPath);

        // https://github.com/glayzzle/php-parser/issues/155
        // currently inline comments include the line break at the end, we need to
        // strip those out and update the end location for each comment manually
        ast.comments?.forEach((comment) => {
            if (comment.value[comment.value.length - 1] === '\r') {
                comment.value = comment.value.slice(0, -1);
                comment.loc!.end.offset = comment.loc!.end.offset - 1;
            }
            if (comment.value[comment.value.length - 1] === '\n') {
                comment.value = comment.value.slice(0, -1);
                comment.loc!.end.offset = comment.loc!.end.offset - 1;
            }
        });

        return this.parseAst(ast, fsPath);
    }

    private isTest(declaration: Declaration) {
        return Parser.validator.isTest(declaration);
    }

    private parseAttributes(declaration: Declaration, _namespace?: Namespace, _class?: Class) {
        return Parser.attributeParser.parse(declaration, _namespace, _class);
    }

    private parseAst(
        ast: Program | Namespace | UseGroup | Class | Node,
        fsPath: string
    ): TestSuite[] | undefined {
        const fn: Function = this.lookup[ast.kind] ?? this.parseChildren;

        return fn.apply(this, [ast, fsPath]);
    }

    private parseNamespace(ast: Program | Namespace | UseGroup | Class | Node, fsPath: string) {
        // new TestCase(fsPath, this.parseAttributes(ast as Declaration, this.namespace));

        return this.parseChildren((this.namespace = ast as Namespace), fsPath);
    }

    private parseClass(ast: Program | Namespace | UseGroup | Class | Node, fsPath: string) {
        const _class = ast as Class;

        if (!this.isTest(_class)) {
            return [];
        }

        let attributes = this.parseAttributes(ast as Declaration, this.namespace);
        const suite = new TestSuite(fsPath, attributes);

        suite.children = _class.body
            .filter((declaration) => this.isTest(declaration))
            .map((declaration) => {
                const attributes = this.parseAttributes(declaration, this.namespace, _class);
                const test = new TestCase(fsPath, attributes);
                test.parent = suite;

                return test;
            });

        return suite.children.length > 0 ? [suite] : undefined;
    }

    private parseChildren(ast: Program | Namespace | UseGroup | Class | Node, fsPath: string) {
        if ('children' in ast) {
            return ast.children.reduce(
                (tests, children: Node) => tests.concat(this.parseAst(children, fsPath) ?? []),
                [] as TestSuite[]
            );
        }

        return;
    }
}

abstract class Test implements Attribute {
    public readonly id!: string;
    public readonly qualifiedClass!: string;
    public readonly namespace!: string;
    public readonly class!: string;
    public readonly start!: Position;
    public readonly end!: Position;
    public readonly annotations!: Annotations;

    constructor(public readonly fsPath: string, attributes: Attribute) {
        Object.assign(this, attributes);
    }
}

export class TestSuite extends Test {
    public children: TestCase[] = [];
}

export class TestCase extends Test {
    public readonly method!: string;
    public parent?: TestSuite;
}

const parser = new Parser();

export const parse = (buffer: Buffer | string, fsPath: string) => parser.parse(buffer, fsPath);
