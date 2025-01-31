import { Call, Closure, Declaration, Identifier, namedargument, Namespace, Node, String, Variable } from 'php-parser';
import { PHPUnitXML } from '../PHPUnitXML';
import { TransformerFactory } from '../Transformer';
import { TestDefinition, TestType } from '../types';
import { annotationParser, attributeParser } from './AnnotationParser';

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

    protected parseName(declaration?: Namespace | Declaration | Call | Identifier | namedargument | String | Variable): string | undefined {
        if (!declaration) {
            return declaration;
        }

        if ('what' in declaration) {
            return this.parseName(declaration.what);
        }

        if (declaration.kind === 'namedargument') {
            return this.parseName(((declaration as namedargument).value as String));
        }

        if ('name' in declaration) {
            if (typeof declaration.name === 'string') {
                return declaration.name;
            }

            if (declaration.name && 'name' in declaration.name) {
                return declaration.name.name;
            }
        }

        if (declaration.kind === 'string') {
            return (declaration as String).value;
        }

        return undefined;
    };

    protected parseClosure(argument: Closure | namedargument) {
        return (argument.kind === 'namedargument' ? (argument as namedargument).value : argument) as Closure;
    }

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

        return { type, id, namespace: namespace, classFQN, label, depth: 0 };
    }
}