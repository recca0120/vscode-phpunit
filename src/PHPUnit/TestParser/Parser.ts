import { Call, Declaration, Identifier, Namespace, Node, Variable } from 'php-parser';
import { PHPUnitXML } from '../PHPUnitXML';
import { annotationParser, attributeParser } from './AnnotationParser';
import { TransformerFactory } from '../Transformer';
import { TestDefinition, TestType } from './types';

export abstract class Parser {
    private phpUnitXML?: PHPUnitXML;

    setPhpUnitXML(phpUnitXML?: PHPUnitXML) {
        this.phpUnitXML = phpUnitXML;
    }

    abstract parse(declaration: Declaration | Node, file: string, namespace?: TestDefinition): TestDefinition[] | undefined;

    protected parsePosition(declaration: Node) {
        const loc = declaration.loc!;
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.end.line, character: loc.end.column };

        return { start, end };
    };

    protected root() {
        return this.phpUnitXML?.root() ?? '';
    }

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

        if (declaration.name && 'name' in declaration.name) {
            return declaration.name.name;
        }

        return undefined;
    };

    protected parseAnnotations(declaration: Declaration) {
        return { ...annotationParser.parse(declaration), ...attributeParser.parse(declaration) };
    }

    protected generateNamespace(namespace?: string): TestDefinition | undefined {
        if (!namespace) {
            return undefined;
        }

        const type = TestType.namespace;
        const classFQN = namespace;
        const converter = TransformerFactory.factory(classFQN);
        const id = converter.uniqueId({ type, classFQN });
        const label = converter.generateLabel({ type, classFQN });

        return { type, id, namespace: namespace, classFQN, label, depth: 1 };
    }
}