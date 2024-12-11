import { Call, Declaration, Identifier, Namespace, Node, Variable } from 'php-parser';
import { annotationParser, attributeParser } from './AnnotationParser';
import { TestDefinition, TestType } from './types';

export abstract class Parser {
    protected root: string = '';

    setRoot(root: string) {
        this.root = root;
    }

    abstract parse(declaration: Declaration | Node, file: string, namespace?: TestDefinition): TestDefinition[] | undefined;

    protected parsePosition(declaration: Node) {
        const loc = declaration.loc!;
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.end.line, character: loc.end.column };

        return { start, end };
    };

    protected parseLabel(annotations: { testdox?: string[] }, qualifiedClass: string, method?: string) {
        if (annotations?.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
        }

        return method ?? qualifiedClass;
    };


    protected parseName(declaration?: Namespace | Declaration | Call | Identifier | Variable): string | undefined {
        if (!declaration) {
            return undefined;
        }

        if ('what' in declaration) {
            return this.parseName(declaration.what);
        }

        if (typeof declaration.name === 'string') {
            return declaration.name;
        }

        if ('name' in declaration.name) {
            return declaration.name.name;
        }

        return undefined;
    };

    protected parseAnnotations(declaration: Declaration) {
        return { ...annotationParser.parse(declaration), ...attributeParser.parse(declaration) };
    }

    protected generateNamespace(namespace?: string): TestDefinition | undefined {
        return namespace ? {
            type: TestType.namespace,
            id: `namespace:${namespace}`,
            namespace: namespace,
            label: namespace,
        } : undefined;
    }
}