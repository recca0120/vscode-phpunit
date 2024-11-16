import { readFile } from 'node:fs/promises';
import { Class, Declaration, Method, Namespace, Node, Program, UseGroup } from 'php-parser';
import { engine } from '../utils';
import { Annotations } from './AnnotationParser';
import { parse as parseProperty } from './PropertyParser';
import { validator } from './Validator';

export type Position = {
    character: number;
    line: number;
};

export type TestDefinition = {
    id: string;
    qualifiedClass: string;
    namespace: string;
    label: string;
    class?: string;
    method?: string;
    parent?: TestDefinition;
    children: TestDefinition[]
    file: string;
    start: Position;
    end: Position;
    annotations: Annotations;
};

class Test implements TestDefinition {
    public readonly id!: string;
    public readonly qualifiedClass!: string;
    public readonly namespace!: string;
    public readonly label!: string;
    public readonly class?: string;
    public readonly method?: string;
    public readonly start!: Position;
    public readonly end!: Position;
    public readonly annotations!: Annotations;
    public parent?: TestDefinition;
    public children: TestDefinition[] = [];

    constructor(attributes: TestDefinition, public readonly file: string) {
        Object.assign(this, attributes);
    }
}

export type Events = {
    onSuite?: (suite: TestDefinition) => void;
    onTest?: (test: TestDefinition, index: number) => void;
};

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    private parserLookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseTestSuite,
    };

    async parseFile(file: string, events: Events = {}) {
        return this.parse(textDecoder.decode(await readFile(file)), file, events);
    }

    parse(text: Buffer | string, file: string, events: Events = {}) {
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

            return this.parseAst(ast, file, events);
        } catch (e) {
            return undefined;
        }
    }

    private parseAst(
        ast: Program | Namespace | UseGroup | Class | Node,
        file: string,
        events: Events = {},
        namespace?: Namespace,
    ): TestDefinition[] | undefined {
        const fn: Function = this.parserLookup[ast.kind] ?? this.parseChildren;

        return fn.apply(this, [ast, file, events, namespace]);
    }

    private parseNamespace(ast: Namespace, file: string, events: Events) {
        return this.parseChildren(ast, file, events, ast);
    }

    private parseTestSuite(ast: Class, file: string, events: Events, namespace?: Namespace) {
        const _class = ast;

        if (!validator.isTest(_class)) {
            return [];
        }

        const parent = { ...parseProperty(ast as Declaration, namespace), file };

        parent.children = _class.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => new Test(parseProperty(method as Method, namespace, _class), file));

        if (parent.children.length <= 0) {
            return;
        }

        parent.children.forEach((child) => (child.parent = parent));

        if (events.onSuite) {
            events.onSuite(parent);
        }

        if (events.onTest) {
            parent.children.forEach((child, index) => events.onTest!(child, index));
        }

        return [parent];
    }

    private parseChildren(
        ast: Program | Namespace | UseGroup | Class | Node,
        file: string,
        events: Events,
        namespace?: Namespace,
    ) {
        if ('children' in ast) {
            return ast.children.reduce(
                (testDefinitions, children) =>
                    testDefinitions.concat(this.parseAst(children, file, events, namespace) ?? []),
                [] as TestDefinition[],
            );
        }

        return;
    }
}
