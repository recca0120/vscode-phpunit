import { Class, Declaration, Engine, Method, Namespace, Node, Program, UseGroup } from 'php-parser';

const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { php7: true, debug: false, extractDoc: true, suppressErrors: false },
    lexer: {
        all_tokens: true,
        comment_tokens: true,
        mode_eval: true,
        asp_tags: true,
        short_tags: true,
    },
});

type Annotations = {
    depends?: string[];
    dataProvider?: string[];
};

const appendAnnotations = (
    annotations: Annotations | any,
    matches: IterableIterator<RegExpMatchArray>
) => {
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
};

const parseAnnotations = (declaration: Declaration): Annotations => {
    const lookup = ['depends', 'dataProvider'];
    const template = (annotation: string) => `@${annotation}\\s+(?<${annotation}>[^\\n\\s]+)`;
    const pattern = new RegExp(lookup.map((name) => template(name)).join('|'), 'g');
    const comments = declaration.leadingComments ?? [];

    return comments
        .map((comment) => comment.value.matchAll(pattern))
        .reduce((result, matches) => appendAnnotations(result, matches), {} as Annotations);
};

const getName = (ast: Namespace | Class | Declaration) => {
    return typeof ast.name === 'string' ? ast.name : ast.name.name;
};

const generateId = (qualifiedClazz: string, method: string) => {
    return `${qualifiedClazz}::${method}`;
};

const generateQualifiedClazz = (clazz: string, namespace?: string) => {
    return [namespace, clazz].filter((name) => !!name).join('\\');
};

const isAnnotationTest = (declaration: Declaration) => {
    return !declaration.leadingComments
        ? false
        : /@test/.test(declaration.leadingComments.map((comment) => comment.value).join('\n'));
};

const isAbstract = (declaration: Class | Method) => {
    return declaration.isAbstract;
};

const acceptModifier = (declaration: Method) => {
    return ['', 'public'].indexOf(declaration.visibility) !== -1;
};

const isTest = (declaration: Declaration) => {
    if (declaration.kind !== 'method') {
        return false;
    }

    const method = declaration as Method;

    if (isAbstract(method) || !acceptModifier(method)) {
        return false;
    }

    return isAnnotationTest(method) || getName(method).startsWith('test');
};

const travel = (
    ast: Program | Namespace | UseGroup | Class | Node,
    filename: string,
    namespace?: Namespace
): TestCase[] | undefined => {
    if (ast.kind === 'usegroup') {
        return;
    }

    if (ast.kind === 'namespace') {
        namespace = ast as Namespace;
    }

    if (ast.kind === 'class') {
        const clazz = ast as Class;

        if (isAbstract(clazz)) {
            return [];
        }

        return clazz.body
            .filter((declaration) => isTest(declaration))
            .map((declaration) => new TestCase(filename, declaration, clazz, namespace));
    }

    if ('children' in ast) {
        return ast.children.reduce(
            (acc, children: Node) => acc.concat(travel(children, filename, namespace) ?? []),
            [] as TestCase[]
        );
    }
};

export class TestCase {
    public readonly id: string;
    public readonly qualifiedClazz: string;
    public readonly namespace?: string;
    public readonly clazz: string;
    public readonly method: string;
    public readonly start: { character: number; line: number };
    public readonly end: { character: number; line: number };
    public readonly annotations: Annotations;

    constructor(
        private readonly filename: string,
        declaration: Declaration,
        clazz: Class,
        namespace?: Namespace
    ) {
        this.namespace = namespace ? getName(namespace) : undefined;
        this.clazz = getName(clazz);
        this.method = getName(declaration);
        this.qualifiedClazz = generateQualifiedClazz(this.clazz, this.namespace);
        this.id = generateId(this.qualifiedClazz, this.method);
        this.annotations = parseAnnotations(declaration);

        const loc = declaration.loc!;
        this.start = { line: loc.start.line, character: loc.start.column };
        this.end = { line: loc.start.line, character: loc.source?.length ?? 0 };
    }

    public toJSON() {
        const { filename, id, namespace, qualifiedClazz, clazz, method, start, end } = this;

        return { filename, id, namespace, qualifiedClazz, clazz, method, start, end };
    }
}

export const parse = (buffer: Buffer | string, filename: string) => {
    return travel(engine.parseCode(buffer.toString(), filename), filename);
};
