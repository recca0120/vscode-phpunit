import { Class, Declaration, Engine, Method, Namespace, Node, Program, UseGroup } from 'php-parser';

const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { php7: true, debug: false, extractDoc: true, suppressErrors: false },
    lexer: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        all_tokens: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        comment_tokens: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mode_eval: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        asp_tags: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        short_tags: true,
    },
});

type Attribute = {
    id: string;
    qualifiedClazz: string;
    namespace: string;
    clazz: string;
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
        class: this.parseClazz,
        method: this.parseMethod,
    };

    private get parser() {
        return AttributeParser.parser;
    }

    public uniqueId(namespace?: string, clazz?: string, method?: string) {
        if (!clazz) {
            return namespace;
        }

        let uniqueId = this.qualifiedClazz(namespace, clazz);
        if (method) {
            uniqueId = `${uniqueId}::${method}`;
        }

        return uniqueId;
    }

    public qualifiedClazz(namespace?: string, clazz?: string) {
        return [namespace, clazz].filter((name) => !!name).join('\\');
    }

    public parse(declaration: Declaration, namespace?: Namespace, clazz?: Class): Attribute {
        const fn = this.lookup[declaration.kind];
        const parsed = fn.apply(this, [declaration, namespace, clazz]);
        const annotations = this.parser.parse(declaration);
        const { start, end } = this.parsePosition(declaration);
        const id = this.uniqueId(parsed.namespace, parsed.clazz, parsed.method);
        const qualifiedClazz = this.qualifiedClazz(parsed.namespace, parsed.clazz);

        return {
            id,
            qualifiedClazz,
            ...parsed,
            start,
            end,
            annotations,
        };
    }

    private parseNamespace(declaration: Declaration) {
        return { namespace: this.parseName(declaration) };
    }

    private parseClazz(declaration: Declaration, namespace?: Namespace) {
        return { namespace: this.parseName(namespace), clazz: this.parseName(declaration) };
    }

    private parseMethod(declaration: Declaration, namespace?: Namespace, clazz?: Class) {
        return {
            namespace: this.parseName(namespace),
            clazz: this.parseName(clazz),
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
        class: this.validateClazz,
        method: this.validateMethod,
    };

    public isTest(declaration: Declaration) {
        const fn = this.lookup[declaration.kind];

        return fn ? fn.apply(this, [declaration]) : false;
    }

    private validateClazz(declaration: Declaration) {
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
            : /@test/.test(declaration.leadingComments.map((comment) => comment.value).join('\n'));
    }

    private acceptModifier(declaration: Method) {
        return ['', 'public'].indexOf(declaration.visibility) !== -1;
    }
}

class Parser {
    private static readonly validator = new Validator();
    private namespace?: Namespace;
    private lookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClazz,
    };

    private get validator() {
        return Parser.validator;
    }

    public parse(
        ast: Program | Namespace | UseGroup | Class | Node,
        filename: string
    ): TestCase[] | undefined {
        const fn: Function = this.lookup[ast.kind] ?? this.parseChildren;

        return fn.apply(this, [ast, filename]);
    }

    private parseNamespace(ast: Program | Namespace | UseGroup | Class | Node, filename: string) {
        // new TestCase(filename, ast as Declaration);

        return this.parseChildren((this.namespace = ast as Namespace), filename);
    }

    private parseClazz(ast: Program | Namespace | UseGroup | Class | Node, filename: string) {
        const clazz = ast as Class;

        if (!this.validator.isTest(clazz)) {
            return [];
        }

        // new TestSuite(filename, clazz, this.namespace);

        return clazz.body
            .filter((declaration) => this.validator.isTest(declaration))
            .map((declaration) => new TestCase(filename, declaration, this.namespace, clazz));
    }

    private parseChildren(ast: Program | Namespace | UseGroup | Class | Node, filename: string) {
        if ('children' in ast) {
            return ast.children.reduce(
                (tests, children: Node) => tests.concat(this.parse(children, filename) ?? []),
                [] as TestCase[]
            );
        }

        return;
    }
}

abstract class Test implements Attribute {
    private static readonly parser = new AttributeParser();

    public readonly id!: string;
    public readonly qualifiedClazz!: string;
    public readonly namespace!: string;
    public readonly clazz!: string;
    public readonly start!: Position;
    public readonly end!: Position;
    public readonly annotations!: Annotations;

    protected get parser() {
        return Test.parser;
    }
}

// export class TestSuite extends Test {
//     constructor(
//         public readonly filename: string,
//         declaration: Declaration,
//         _namespace?: Namespace
//     ) {
//         super();
//         Object.assign(this, this.parser.parse(declaration, _namespace));
//     }
// }

export class TestCase extends Test {
    public readonly method!: string;

    constructor(
        public readonly filename: string,
        declaration: Declaration,
        _namespace?: Namespace,
        _clazz?: Class
    ) {
        super();
        Object.assign(this, this.parser.parse(declaration, _namespace, _clazz));
    }
}

export const parse = (buffer: Buffer | string, filename: string) => {
    return new Parser().parse(engine.parseCode(buffer.toString(), filename), filename);
};
