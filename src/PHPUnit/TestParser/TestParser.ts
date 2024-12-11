import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { Class, Declaration, Method, Namespace, Node, Program } from 'php-parser';
import { engine } from '../utils';
import { Annotations, parse as parseAnnotation } from './AnnotationParser';
import { propertyParser } from './PropertyParser';
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

export class PHPUnitTestParser {
    private parserLookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseTestSuite,
    };

    parse(ast: Program | Declaration | Node, file: string, namespace?: TestDefinition): TestDefinition[] | undefined {
        const fn: Function = this.parserLookup[ast.kind] ?? this.parseChildren;

        return fn.apply(this, [ast, file, namespace]);
    }

    private parseNamespace(ast: Namespace & Declaration, file: string) {
        const name = propertyParser.parseName(ast);

        return this.parseChildren(ast, file, {
            type: TestType.namespace,
            id: `namespace:${name}`,
            namespace: name,
            label: name,
        } as TestDefinition);
    }

    private parseTestSuite(declaration: Class & Declaration, file: string, namespace?: TestDefinition) {
        if (!validator.isTest(declaration)) {
            return undefined;
        }

        const name = propertyParser.parseName(declaration)!;
        const id = propertyParser.uniqueId(namespace?.namespace, name);
        const qualifiedClass = propertyParser.qualifiedClass(namespace?.namespace, name);
        const annotations = parseAnnotation(declaration);
        const label = propertyParser.parseLabel(annotations, name);
        const { start, end } = propertyParser.parsePosition(declaration);

        const clazz = {
            type: TestType.class,
            id,
            label,
            qualifiedClass,
            namespace: namespace?.namespace,
            class: name,
            annotations,
            file,
            start,
            end,
        } as TestDefinition;

        const methods = declaration.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => {
                return { ...this.parseTestCase(method, clazz, namespace), file };
            });

        if (methods.length <= 0) {
            return undefined;
        }

        return [{ ...clazz, children: methods }];
    }

    private parseTestCase(method: Declaration, clazz: TestDefinition, namespace?: TestDefinition) {
        const name = propertyParser.parseName(method)!;
        const id = propertyParser.uniqueId(namespace?.namespace, clazz.class, name);
        const label = propertyParser.parseLabel(method, clazz.class!, name);
        const annotations = parseAnnotation(method);
        const { start, end } = propertyParser.parsePosition(method);

        return {
            type: TestType.method,
            id,
            label,
            qualifiedClass: clazz.qualifiedClass,
            namespace: clazz.namespace,
            class: clazz.class,
            method: name,
            annotations,
            start,
            end,
        };
    }

    private parseChildren(ast: Program | Declaration | Node, file: string, namespace?: TestDefinition) {
        if (!('children' in ast)) {
            return undefined;
        }

        const tests = ast.children.reduce((testDefinitions, children) => {
            return testDefinitions.concat(this.parse(children, file, namespace) ?? []);
        }, [] as TestDefinition[]);

        if (namespace && tests.length > 0) {
            return [{ ...namespace, children: tests }];
        }

        return tests;
    }
}

export class TestParser {
    protected eventEmitter = new EventEmitter;

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

    protected parseAst(ast: Program | Node, file: string): TestDefinition[] | undefined {
        const parser = new PHPUnitTestParser();

        return this.emit(parser.parse(ast, file));
    }

    private emit(tests?: TestDefinition[]) {
        tests?.forEach(test => {
            this.eventEmitter.emit(`${test.type}`, test);
            if (test.children && test.children.length > 0) {
                this.emit(test.children);
            }
        });

        return tests;
    }
}
