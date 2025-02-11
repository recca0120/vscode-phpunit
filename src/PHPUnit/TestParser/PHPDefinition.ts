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
    what?: (Name | PropertyLookup) & { offset?: Identifier },
    arguments?: AST[],
    value?: string;
}

export const annotationParser = new AnnotationParser();
export const attributeParser = new AttributeParser();

abstract class TestDefinitionBuilder {
    constructor(protected definition: PHPDefinition) {
    }

    abstract build(): TestDefinition;

    protected generate(testDefinition: Partial<TestDefinition>) {
        testDefinition = {
            type: this.definition.type,
            classFQN: this.definition.classFQN,
            children: [],
            annotations: this.definition.annotations,
            file: this.definition.file,
            ...this.definition.position,
            ...testDefinition,
        };
        const transformer = this.getTransformer(testDefinition);
        testDefinition.id = transformer.uniqueId(testDefinition as TestDefinition);
        testDefinition.label = transformer.generateLabel(testDefinition as TestDefinition);

        return testDefinition as TestDefinition;
    }

    private getTransformer(testDefinition: Pick<TestDefinition, 'classFQN'>): Transformer {
        return TransformerFactory.factory(testDefinition.classFQN!);
    }
}

class NamespaceDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        const type = TestType.namespace;
        const depth = 0;

        const classFQN = this.definition.classFQN;
        if (this.definition.kind === 'program') {
            const partsFQN = classFQN!.split('\\');
            const namespace = partsFQN.slice(0, -1).join('\\');

            return this.generate({ type, depth, namespace, classFQN: namespace });
        }

        if (this.definition.kind === 'class') {
            const partsFQN = classFQN!.split('\\');
            const className = partsFQN.pop()!;
            const namespace = partsFQN.join('\\');

            return this.generate({ type, depth, namespace, classFQN: namespace, className });
        }

        return this.generate({ type, depth, namespace: classFQN, classFQN });
    }
}

class TestSuiteDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        return this.generate({
            namespace: this.definition.parent?.name,
            className: this.definition.name,
            depth: 1,
        });
    }
}

class TestCaseDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        return this.generate({
            namespace: this.definition.parent!.parent?.name,
            className: this.definition.parent!.name,
            methodName: this.definition.name,
            depth: 2,
        });
    }
}

class PestTestDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        if (this.definition.kind === 'program') {
            const classFQN = this.definition.classFQN!;
            const partsFQN = classFQN.split('\\');
            const className = partsFQN.pop()!;

            return this.generate({ namespace: partsFQN.join('\\'), className, depth: 1 });
        }

        let depth = 2;

        let { methodName, label } = this.parseMethodNameAndLabel();

        if (this.definition.type === TestType.describe) {
            methodName = '`' + methodName + '`';
        }

        let parent = this.definition.parent;
        while (parent && parent.kind === 'call' && parent.type !== TestType.describe) {
            parent = parent.parent;
        }

        if (parent?.type === TestType.describe) {
            const describeNames: string[] = [];
            while (parent && parent.type === TestType.describe) {
                describeNames.push('`' + parent.arguments[0].name + '`');
                parent = parent.parent;
                depth++;
            }
            methodName = describeNames.reverse().concat(methodName).join(' → ');
        }

        const { classFQN, namespace, className } = parent!.toTestDefinition();

        return this.generate({ classFQN, namespace, className, methodName, label, depth });
    }

    private parseMethodNameAndLabel() {
        const args = this.definition.arguments;

        if (this.definition.name !== 'arch') {
            let methodName = args[0].name;

            if (this.definition.name === 'it') {
                methodName = 'it ' + methodName;
            }

            return { methodName, label: methodName };
        }

        if (args.length > 0) {
            const methodName = args[0].name;

            return { methodName, label: methodName };
        }

        const names = [] as string[];
        let parent = this.definition.parent;
        while (parent && parent.kind === 'call') {
            names.push(parent.name);
            parent = parent.parent;
        }

        const methodName = names
            .map((name: string) => name === 'preset' ? `${name}  ` : ` ${name} `)
            .join('→');

        const label = names.join(' → ');

        return { methodName, label };
    }
}

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
            if (this.ast.what.offset && this.ast.what.offset.kind === 'identifier') {
                return this.ast.what.offset.name;
            }

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

                const parent = ['block'].includes(this.kind) ? this.parent : this;
                let options = { ...this.options, parent };

                let ast = node.expression as AST;
                while (ast.what) {
                    if (ast.what.kind === 'name') {
                        break;
                    }
                    if (ast.kind === 'call') {
                        options.parent = new PHPDefinition(ast, { ...options });
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
            return ['it', 'test', 'describe', 'arch'].includes(this.name);
        }

        return false;
    }

    toTestDefinition(): TestDefinition {
        if (this.kind === 'class') {
            return new TestSuiteDefinitionBuilder(this).build();
        }

        if (this.kind === 'method') {
            return new TestCaseDefinitionBuilder(this).build();
        }

        return new PestTestDefinitionBuilder(this).build();
    }

    createNamespaceTestDefinition(): TestDefinition {
        return new NamespaceDefinitionBuilder(this).build();
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