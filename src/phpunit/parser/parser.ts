import { Class, Declaration, Method, Namespace, Node, Program, UseGroup } from 'php-parser';
import { engine } from './utils';
import { validator } from './validator';
import { propertyParser, parse as parseProperty } from './property-parser';
import { Annotations } from './annotation-parser';

export type Position = {
    character: number;
    line: number;
};

export type Attribute = {
    id: string;
    qualifiedClass: string;
    namespace: string;
    class?: string;
    method?: string;
    start: Position;
    end: Position;
    annotations: Annotations;
};

export class Test implements Attribute {
    public readonly id!: string;
    public readonly qualifiedClass!: string;
    public readonly namespace!: string;
    public readonly class?: string;
    public readonly method?: string;
    public readonly start!: Position;
    public readonly end!: Position;
    public readonly annotations!: Annotations;
    public parent?: Test;
    public children: Test[] = [];

    constructor(public readonly file: string, attributes: Attribute) {
        Object.assign(this, attributes);
    }
}

export class Parser {
    private namespace?: Namespace;

    private lookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClass,
    };

    public parse(text: Buffer | string, file: string) {
        this.namespace = undefined;
        text = text.toString();

        // Todo https://github.com/glayzzle/php-parser/issues/170
        text = text.replace(/\?>\r?\n<\?/g, '?>\n___PSEUDO_INLINE_PLACEHOLDER___<?');

        try {
            const ast = engine.parseCode(text, file);

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

            return this.parseAst(ast, file);
        } catch (e) {
            return undefined;
        }
    }

    private parseAst(
        ast: Program | Namespace | UseGroup | Class | Node,
        file: string
    ): Test[] | undefined {
        const fn: Function = this.lookup[ast.kind] ?? this.parseChildren;

        return fn.apply(this, [ast, file]);
    }

    private parseNamespace(ast: Namespace, file: string) {
        // new TestCase(file, this.parseAttributes(ast as Declaration, this.namespace));

        return this.parseChildren((this.namespace = ast), file);
    }

    private parseClass(ast: Class, file: string) {
        const _class = ast;

        if (!validator.isTest(_class)) {
            return [];
        }

        const attributes = parseProperty(ast as Declaration, this.namespace);
        const suite = new Test(file, attributes);

        suite.children = _class.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => {
                const attributes = parseProperty(method, this.namespace, _class);
                const test = new Test(file, attributes);
                test.parent = suite;

                return test;
            });

        return suite.children.length > 0 ? [suite] : undefined;
    }

    private parseChildren(ast: Program | Namespace | UseGroup | Class | Node, file: string) {
        if ('children' in ast) {
            return ast.children.reduce(
                (tests, children: Node) => tests.concat(this.parseAst(children, file) ?? []),
                [] as Test[]
            );
        }

        return;
    }
}
