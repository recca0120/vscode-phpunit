import { Class, Declaration, Method, Namespace, Node, Program } from 'php-parser';
import { Parser } from './Parser';
import { generateClassFQN, generateUniqueId } from './TestParser';
import { TestDefinition, TestType } from './types';
import { validator } from './Validator';

export class PHPUnitParser extends Parser {
    private parserLookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClass,
    };

    parse(declaration: Declaration | Node, file: string, namespace?: TestDefinition): TestDefinition[] | undefined {
        const fn: Function = this.parserLookup[declaration.kind] ?? this.parseChildren;

        return fn.apply(this, [declaration, file, namespace]);
    }

    private parseNamespace(declaration: Declaration & Namespace, file: string) {
        return this.parseChildren(declaration, file, this.generateNamespace(this.parseName(declaration)));
    }

    private parseClass(declaration: Declaration & Class, file: string, namespace?: TestDefinition) {
        if (!validator.isTest(declaration)) {
            return undefined;
        }

        const className = this.parseName(declaration)!;
        const id = generateUniqueId(namespace?.namespace, className);
        const classFQN = generateClassFQN(namespace?.namespace, className);
        const annotations = this.parseAnnotations(declaration);
        const label = this.parseLabel(annotations, className);

        const clazz = {
            type: TestType.class,
            id,
            label,
            classFQN,
            namespace: namespace?.namespace,
            className,
            annotations,
            file,
            ...this.parsePosition(declaration),
        } as TestDefinition;

        const methods = declaration.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => {
                return this.parseMethod(method, clazz);
            });

        if (methods.length <= 0) {
            return undefined;
        }

        return [{ ...clazz, children: methods }];
    }

    private parseMethod(declaration: Declaration, clazz: TestDefinition): TestDefinition {
        const methodName = this.parseName(declaration);
        const id = generateUniqueId(clazz.namespace, clazz.className, methodName)!;
        const label = this.parseLabel({}, clazz.className!, methodName);
        const annotations = this.parseAnnotations(declaration);

        return {
            ...clazz,
            type: TestType.method,
            id,
            label,
            methodName,
            annotations,
            ...this.parsePosition(declaration),
        };
    }

    private parseChildren(declaration: Declaration | Program | Node, file: string, namespace?: TestDefinition) {
        if (!('children' in declaration)) {
            return undefined;
        }

        const tests = declaration.children.reduce((testDefinitions, child: Node) => {
            return testDefinitions.concat(this.parse(child, file, namespace) ?? []);
        }, [] as TestDefinition[]);

        if (!tests || tests.length === 0) {
            return undefined;
        }

        return namespace
            ? [{ ...namespace, children: tests }]
            : tests;
    }
}