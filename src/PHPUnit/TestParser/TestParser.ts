import { EventEmitter } from 'node:events';
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
    type: TestType;
    id: string;
    label: string;
    namespace?: string;
    qualifiedClass?: string;
    class?: string;
    method?: string;
    parent?: TestDefinition;
    children?: TestDefinition[]
    file?: string;
    start?: Position;
    end?: Position;
    annotations?: Annotations;
};


export enum TestType {
    namespace,
    class,
    method
}

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    private parserLookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseTestSuite,
    };
    private eventEmitter = new EventEmitter;

    on(eventName: TestType, callback: (testDefinition: TestDefinition, index?: number) => void) {
        this.eventEmitter.on(`${eventName}`, callback);
    }

    async parseFile(file: string) {
        return this.parse(textDecoder.decode(await readFile(file)), file);
    }

    parse(text: Buffer | string, file: string) {
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
        file: string,
        namespace?: Namespace,
    ): TestDefinition[] | undefined {
        const fn: Function = this.parserLookup[ast.kind] ?? this.parseChildren;

        return fn.apply(this, [ast, file, namespace]);
    }

    private parseNamespace(ast: Namespace, file: string) {
        return this.parseChildren(ast, file, ast);
    }

    private parseTestSuite(ast: Class, file: string, namespace?: Namespace) {
        const _class = ast;

        if (!validator.isTest(_class)) {
            return [];
        }

        const clazz = {
            ...parseProperty(ast as Declaration, namespace),
            type: TestType.class,
            file,
        };

        const methods = _class.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => {
                return {
                    ...parseProperty(method as Method, namespace, _class),
                    type: TestType.method,
                    file,
                };
            });

        if (methods.length <= 0) {
            return;
        }

        if (clazz.namespace) {
            this.eventEmitter.emit(`${TestType.namespace}`, {
                type: TestType.namespace,
                id: `namespace:${clazz.namespace}`,
                qualifiedClass: clazz.namespace!,
                label: clazz.namespace,
            });
        }


        this.eventEmitter.emit(`${TestType.class}`, clazz);

        methods.forEach((method, index) => {
            this.eventEmitter.emit(`${TestType.method}`, method, index);
        });

        return [{ ...clazz, children: methods }];
    }

    private parseChildren(
        ast: Program | Namespace | UseGroup | Class | Node,
        file: string,
        namespace?: Namespace,
    ) {
        if ('children' in ast) {
            return ast.children.reduce(
                (testDefinitions, children) =>
                    testDefinitions.concat(this.parseAst(children, file, namespace) ?? []),
                [] as TestDefinition[],
            );
        }

        return;
    }
}
