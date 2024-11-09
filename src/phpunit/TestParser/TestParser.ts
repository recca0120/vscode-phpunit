import { Class, Declaration, Method, Namespace, Node, Program, UseGroup } from 'php-parser';
import { engine } from '../utils';
import { validator } from './Validator';
import { parse as parseProperty } from './PropertyParser';
import { Annotations } from './AnnotationParser';

export type Position = {
    character: number;
    line: number;
};

export type TestDefinition = {
    id: string;
    qualifiedClass: string;
    namespace: string;
    class?: string;
    method?: string;
    start: Position;
    end: Position;
    annotations: Annotations;
};

export class Test implements TestDefinition {
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

    constructor(
        public readonly file: string,
        attributes: TestDefinition,
    ) {
        Object.assign(this, attributes);
    }

    get label() {
        if (this.annotations.testdox && this.annotations.testdox.length > 0) {
            return this.annotations.testdox[this.annotations.testdox.length - 1];
        }

        return (this.children.length > 0 ? this.qualifiedClass : this.method) ?? '';
    }
}

export type Events = {
    onSuite?: (suite: Test) => void;
    onTest?: (test: Test, index: number) => void;
};

export class TestParser {
    private parserLookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseTestSuite,
    };

    public parse(text: Buffer | string, file: string, events: Events = {}) {
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
    ): Test[] | undefined {
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

        const suite = new Test(file, parseProperty(ast as Declaration, namespace));

        suite.children = _class.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => new Test(file, parseProperty(method as Method, namespace, _class)));

        if (suite.children.length <= 0) {
            return;
        }

        suite.children.forEach((test) => (test.parent = suite));

        if (events.onSuite) {
            events.onSuite(suite);
        }

        if (events.onTest) {
            suite.children.forEach((test, index) => events.onTest!(test, index));
        }

        return [suite];
    }

    private parseChildren(
        ast: Program | Namespace | UseGroup | Class | Node,
        file: string,
        events: Events,
        namespace?: Namespace,
    ) {
        if ('children' in ast) {
            return ast.children.reduce(
                (tests, children) =>
                    tests.concat(this.parseAst(children, file, events, namespace) ?? []),
                [] as Test[],
            );
        }

        return;
    }
}
