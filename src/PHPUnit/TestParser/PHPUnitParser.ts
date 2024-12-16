import { Class, Declaration, Method, Namespace, Node, Program } from 'php-parser';
import { Parser } from './Parser';
import { TransformerFactory } from './Transformers';
import { TestDefinition, TestType } from './types';
import { validator } from './Validator';

export class PHPUnitParser extends Parser {
    private parserLookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClass,
    };

    private converter = TransformerFactory.factory('phpunit');

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

        const type = TestType.class;
        const annotations = this.parseAnnotations(declaration);

        const className = this.parseName(declaration)!;
        const classFQN = [namespace?.namespace, className].filter((name) => !!name).join('\\');
        const id = this.converter.uniqueId({ type, classFQN, annotations });
        const label = this.converter.generateLabel({ type, classFQN, className, annotations });

        const clazz = {
            type,
            id,
            label,
            classFQN,
            namespace: namespace?.namespace,
            className,
            annotations,
            file, ...this.parsePosition(declaration),
        } as TestDefinition;

        const methods = declaration.body
            .filter((method) => validator.isTest(method as Method))
            .map((method) => this.parseMethod(method, clazz));

        if (methods.length <= 0) {
            return undefined;
        }

        return [{ ...clazz, children: methods }];
    }

    private parseMethod(declaration: Declaration, clazz: TestDefinition): TestDefinition {
        const type = TestType.method;
        const annotations = this.parseAnnotations(declaration);

        const methodName = this.parseName(declaration);
        const id = this.converter.uniqueId({ ...clazz, type, methodName, annotations });
        const label = this.converter.generateLabel({ ...clazz, type, methodName, annotations });

        return { ...clazz, type, id, label, methodName, annotations, ...this.parsePosition(declaration) };
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

        return namespace ? [{ ...namespace, children: tests }] : tests;
    }
}