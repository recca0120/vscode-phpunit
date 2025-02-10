import { basename, dirname, join, relative } from 'node:path';
import { Declaration, Identifier, Name, Namespace, Node, PropertyLookup } from 'php-parser';
import { PHPUnitXML } from '../PHPUnitXML';
import { Transformer, TransformerFactory } from '../Transformer';
import { TestDefinition, TestType } from '../types';
import { capitalize } from '../utils';
import { AnnotationParser, AttributeParser } from './AnnotationParser';

type AST = Node & {
    name?: Identifier | string,
    visibility?: string,
    isAbstract?: boolean,
    body?: Node[],
    children?: Node[],
    expression?: AST
    what?: Name | PropertyLookup,
    arguments?: AST[],
    value?: string;
}

export const annotationParser = new AnnotationParser();
export const attributeParser = new AttributeParser();

export class PHPDefinition {
    constructor(private readonly ast: AST, private options: {
        phpUnitXML: PHPUnitXML,
        file: string,
        namespace?: PHPDefinition,
        parent?: PHPDefinition,
    }) {
    }

    get kind() {
        return this.ast.kind;
    }

    get file() {
        return this.options.file;
    }

    get root() {
        return this.options.phpUnitXML.root();
    }

    get type() {
        if (this.kind === 'namespace') {
            return TestType.namespace;
        }

        if (['program', 'class'].includes(this.kind)) {
            return TestType.class;
        }

        if (this.kind === 'method') {
            return TestType.method;
        }

        if (this.kind === 'call') {
            return this.name === 'describe' ? TestType.describe : TestType.method;
        }

        return undefined;
    }

    get classFQN(): string | undefined {
        if (this.kind === 'program') {
            let relativePath = relative(this.root, this.file);
            let baseName = basename(this.file, '.php');
            const dotPos = baseName.lastIndexOf('.');
            if (dotPos !== -1) {
                baseName = baseName.substring(0, dotPos);
            }
            relativePath = join(capitalize(dirname(relativePath)), baseName).replace(/\//g, '\\');
            relativePath = relativePath.replace(/%[a-fA-F0-9][a-fA-F0-9]/g, '');
            relativePath = relativePath.replace(/\\'|\\"/g, '');
            relativePath = relativePath.replace(/[^A-Za-z0-9\\]/, '');

            return 'P\\' + relativePath;
        }

        if (this.kind === 'namespace') {
            return this.name;
        }

        if (this.kind === 'class') {
            return [this.parent?.name, this.name].filter((name) => !!name).join('\\');
        }

        return this.parent?.classFQN;
    }

    get parent() {
        return this.options.parent!;
    }

    get children() {
        if (this.kind === 'namespace') {
            return this.getClasses();
        }

        if (this.kind === 'class') {
            return this.getMethods();
        }

        return undefined;
    }

    get arguments() {
        return this.ast.arguments?.map((ast: AST) => {
            return new PHPDefinition(ast, { ...this.options, parent: this });
        }) ?? [];
    }

    get name(): string {
        if (this.ast.kind === 'namedargument') {
            if ((this.ast.value as any).kind === 'string') {
                return (this.ast.value as any).value;
            }
        }

        if (typeof this.ast.name === 'string') {
            return this.ast.name;
        }

        if (this.ast.name?.name) {
            return this.ast.name?.name;
        }

        if (this.ast.what) {
            return (this.ast.what as Name).name;
        }

        if (this.ast.kind === 'string') {
            return this.ast.value!;
        }

        return '';
    }

    get annotations() {
        return {
            ...annotationParser.parse(this.ast as Declaration),
            ...attributeParser.parse(this.ast as Declaration),
        };
    }

    get position() {
        const loc = this.ast.loc!;
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.end.line, character: loc.end.column };

        return { start, end };
    }

    getClasses() {
        const definitions: PHPDefinition[] = this.kind !== 'program'
            ? []
            : this.getNamespaces().reduce((definitions, definition: PHPDefinition) => {
                return definitions.concat(definition.getClasses());
            }, [] as PHPDefinition[]);

        const options = { ...this.options };
        if (this.kind === 'namespace') {
            options.parent = this;
        }

        return definitions.concat((this.ast.children ?? [])
            .map((node: Node) => new PHPDefinition(node, options))
            .filter((definition: PHPDefinition) => definition.kind === 'class'));
    }

    getFunctions(): PHPDefinition[] {
        const args = this.arguments;

        if (this.type === TestType.describe) {
            return args[1].getFunctions();
        }

        if (args.length > 1 && args[1].kind === 'namedargument') {
            return args[1].getFunctions();
        }

        if (args.length > 1 && args[1].kind === 'arrowfunc') {
            return [new PHPDefinition(this.ast, this.options)];
        }

        const parent = ['block'].includes(this.kind) ? this.parent : this;
        const options = { ...this.options, parent };

        if (['closure', 'arrowfunc'].includes(this.kind) && this.ast.body) {
            return new PHPDefinition(this.ast.body as any, this.options).getFunctions();
        }

        if (this.kind === 'namedargument') {
            return new PHPDefinition((this.ast.value as any).body, this.options).getFunctions();
        }

        return (this.ast.children ?? [])
            .reduce((children: AST[], node) => {
                return children.concat(node.kind === 'namespace' ? (node as Namespace).children : [node]);
            }, [])
            .reduce((definitions, node: AST) => {
                if (!(node.kind === 'expressionstatement' && (node.expression as any).kind !== 'include')) {
                    return definitions;
                }

                let ast = node.expression as AST;
                while (ast.what) {
                    if (ast.what.kind === 'name') {
                        break;
                    }
                    ast = ast.what as AST;
                }

                return definitions.concat(new PHPDefinition(ast, options));
            }, [] as PHPDefinition[]);
    }

    isTest() {
        if (this.ast.isAbstract) {
            return false;
        }

        if (this.kind === 'class') {
            return this.name.endsWith('Test') && this.children!.some((definition): boolean => definition.isTest());
        }

        if (this.kind === 'method' && this.acceptModifier()) {
            return this.name.startsWith('test') ||
                annotationParser.isTest(this.ast as any) ||
                attributeParser.isTest(this.ast as any);
        }

        if (this.kind === 'call') {
            return ['it', 'test', 'describe'].includes(this.name);
        }

        return false;
    }

    toTestDefinition(): TestDefinition {
        const testDefinition: Partial<TestDefinition> = {
            type: this.type,
            classFQN: this.classFQN,
            children: [],
            annotations: this.annotations,
            file: this.file,
            ...this.position,
        };

        if (this.kind === 'class') {
            testDefinition.namespace = this.parent?.name;
            testDefinition.className = this.name;
            testDefinition.depth = 1;
        }

        if (this.kind === 'method') {
            testDefinition.namespace = this.parent!.parent?.name;
            testDefinition.className = this.parent!.name;
            testDefinition.methodName = this.name;
            testDefinition.depth = 2;
        }

        if (this.kind === 'program') {
            const classFQN = this.classFQN!;
            const partsFQN = classFQN.split('\\');
            const className = partsFQN.pop()!;
            testDefinition.namespace = partsFQN.join('\\');
            testDefinition.className = className;
            testDefinition.depth = 1;
        }

        if (this.kind === 'call') {
            let depth = 2;
            let methodName = this.arguments[0].name;

            if (this.name === 'it') {
                methodName = 'it ' + methodName;
            }

            const label = methodName;

            if (this.type === TestType.describe) {
                methodName = '`' + methodName + '`';
            }

            if (this.parent?.type === TestType.describe) {
                const describeNames: string[] = [];
                let parent: PHPDefinition | undefined = this.parent;
                while (parent && parent.type === TestType.describe) {
                    describeNames.push('`' + parent.arguments[0].name + '`');
                    parent = parent.parent;
                    depth++;
                }
                methodName = describeNames.reverse().concat(methodName).map(name => name).join(' → ');
            }

            const { classFQN, namespace, className } = this.parent!.toTestDefinition();
            testDefinition.classFQN = classFQN;
            testDefinition.namespace = namespace;
            testDefinition.className = className;
            testDefinition.methodName = methodName;
            testDefinition.label = label;
            testDefinition.depth = depth;
        }

        const transformer = this.getTransformer(testDefinition);
        testDefinition.id = transformer.uniqueId(testDefinition as TestDefinition);
        testDefinition.label = transformer.generateLabel(testDefinition as TestDefinition);

        return testDefinition as TestDefinition;
    }

    createNamespaceTestDefinition(): TestDefinition {
        const testDefinition: Partial<TestDefinition> = {
            type: TestType.namespace,
            children: [],
            file: this.file,
            depth: 0,
        };

        const classFQN = this.classFQN;
        if (this.kind === 'program') {
            const partsFQN = classFQN!.split('\\');
            const namespace = partsFQN.slice(0, -1).join('\\');
            testDefinition.namespace = namespace;
            testDefinition.classFQN = namespace;
        } else if (this.kind === 'class') {
            const partsFQN = classFQN!.split('\\');
            const className = partsFQN.pop()!;
            const namespace = partsFQN.join('\\');
            testDefinition.namespace = namespace;
            testDefinition.classFQN = namespace;
            testDefinition.className = className;
        } else {
            testDefinition.namespace = classFQN;
            testDefinition.classFQN = classFQN;
        }

        const transformer = this.getTransformer(testDefinition);
        testDefinition.id = transformer.uniqueId(testDefinition as TestDefinition);
        testDefinition.label = transformer.generateLabel(testDefinition as TestDefinition);

        return testDefinition as TestDefinition;
    }

    private getTransformer(testDefinition: Pick<TestDefinition, 'classFQN'>): Transformer {
        return TransformerFactory.factory(testDefinition.classFQN!);
    }

    private getMethods(): PHPDefinition[] {
        if (['program', 'namespace'].includes(this.ast.kind)) {
            return this.getClasses().reduce((definitions: PHPDefinition[], definition: PHPDefinition) => {
                return definitions.concat(definition.getMethods());
            }, []);
        }

        const options = { ...this.options };
        if (this.kind === 'class') {
            options.parent = this;
        }

        return (this.ast.body ?? [])
            .map((node: Node) => new PHPDefinition(node, options))
            .filter((definition: PHPDefinition) => definition.kind === 'method');
    }

    private getNamespaces() {
        if (this.kind !== 'program') {
            return [];
        }

        return (this.ast.children ?? [])
            .map((node: Node) => new PHPDefinition(node, this.options))
            .filter((definition: PHPDefinition) => definition.kind === 'namespace');
    }

    private acceptModifier() {
        return ['', 'public'].includes(this.ast.visibility!);
    }
}