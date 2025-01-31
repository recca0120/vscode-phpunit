import { Identifier, Method, Node } from 'php-parser';
import { AnnotationParser, AttributeParser } from './AnnotationParser';

export const annotationParser = new AnnotationParser();
export const attributeParser = new AttributeParser();

export function isTest(method: Method) {
    return annotationParser.isTest(method) || attributeParser.isTest(method);
}

export class PHPDefinition {
    constructor(
        private readonly ast: Node & {
            name?: Identifier | string,
            visibility?: string,
            isAbstract?: boolean,
            body?: Node[],
            children?: Node[],
        },
        private options: {
            namespace?: PHPDefinition,
            class?: PHPDefinition,
            file: string
        },
    ) {}

    getNamespaces() {
        if (this.kind !== 'program') {
            return [];
        }

        return (this.ast.children ?? [])
            .map((node: Node) => new PHPDefinition(node, this.options))
            .filter((definition: PHPDefinition) => definition.kind === 'namespace');
    }

    getClasses() {
        if (this.kind === 'program') {
            return this.getNamespaces().reduce((definitions: PHPDefinition[], namespace: PHPDefinition) => {
                definitions.push(...namespace.getClasses());

                return definitions;
            }, []);
        }

        const options = this.options;
        if (this.kind === 'namespace') {
            options.namespace = this;
        }

        return (this.ast.children ?? [])
            .map((node: Node) => new PHPDefinition(node, options))
            .filter((definition: PHPDefinition) => definition.kind === 'class');
    }

    getMethods() {
        if (['program', 'namespace'].includes(this.ast.kind)) {
            return this.getClasses().reduce((definitions: PHPDefinition[], clazz: PHPDefinition) => {
                definitions.push(...clazz.getMethods());

                return definitions;
            }, []);
        }

        const options = this.options;
        if (this.kind === 'class') {
            options.class = this;
        }

        return (this.ast.body ?? [])
            .map((node: Node) => new PHPDefinition(node, options))
            .filter((definition: PHPDefinition) => definition.kind === 'method');
    }

    get kind() {
        return this.ast.kind;
    }

    get file() {
        return this.options.file;
    }

    get namespace() {
        return this.options.namespace;
    }

    get class() {
        return this.options.class;
    }

    get methods() {
        return this.kind === 'class' ? this.getMethods() : undefined;
    }

    get name() {
        if (typeof this.ast.name === 'string') {
            return this.ast.name;
        }

        return this.ast.name?.name ?? '';
    }

    get annotations() {
        return { ...annotationParser.parse(this.ast as any), ...attributeParser.parse(this.ast as any) };
    }

    isTest() {
        if (this.ast.isAbstract) {
            return false;
        }

        if (this.kind === 'class') {
            return this.name.endsWith('Test');
        }

        if (this.kind === 'method' && this.acceptModifier()) {
            return this.name.startsWith('test') || isTest(this.ast as any);
        }

        return false;
    }

    private acceptModifier() {
        return ['', 'public'].includes(this.ast.visibility!);
    }
}