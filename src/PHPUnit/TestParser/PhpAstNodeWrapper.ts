import type {
    Declaration,
    Identifier,
    Method,
    Name,
    Namespace,
    Node,
    PropertyLookup,
} from 'php-parser';
import type { PHPUnitXML } from '../PHPUnitXML';
import { type TestDefinition, TestType } from '../types';
import { AnnotationParser, AttributeParser } from './AnnotationParser';
import { generatePestClassFQN } from './PestClassFQNGenerator';
import {
    NamespaceDefinitionBuilder,
    PestTestDefinitionBuilder,
    TestCaseDefinitionBuilder,
    TestSuiteDefinitionBuilder,
} from './TestDefinitionBuilder';

const annotationParser = new AnnotationParser();
const attributeParser = new AttributeParser();

type AST = Node & {
    name?: Identifier | string;
    visibility?: string;
    isAbstract?: boolean;
    extends?: Identifier | Name | null;
    body?: Node[];
    children?: Node[];
    expression?: AST;
    what?: (Name | PropertyLookup) & { offset?: Identifier };
    arguments?: AST[];
    value?: string;
    items?: AST[];
};

export class PhpAstNodeWrapper {
    constructor(
        private readonly ast: AST,
        private options: {
            phpUnitXML: PHPUnitXML;
            file: string;
            namespace?: PhpAstNodeWrapper;
            parent?: PhpAstNodeWrapper;
        },
    ) {}

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
            return generatePestClassFQN(this.root, this.file);
        }

        if (this.kind === 'namespace') {
            return this.name;
        }

        if (this.kind === 'class') {
            return [this.parent?.name, this.name].filter((name) => !!name).join('\\');
        }

        return this.parent?.classFQN;
    }

    get isAbstract(): boolean {
        return this.ast.isAbstract === true;
    }

    get extendsName(): string | undefined {
        const ext = this.ast.extends;
        if (!ext) {
            return undefined;
        }

        if (typeof ext === 'string') {
            return ext;
        }

        return (ext as Name).name ?? (ext as Identifier).name;
    }

    get parentFQN(): string | undefined {
        if (this.kind !== 'class') {
            return undefined;
        }

        const raw = this.extendsName;
        if (!raw) {
            return undefined;
        }

        // Already fully qualified
        if (raw.startsWith('\\')) {
            return raw.substring(1);
        }

        // Check use statements
        const useMap = this.resolveUseStatements();
        const firstPart = raw.split('\\')[0];
        const resolved = useMap.get(firstPart);
        if (resolved) {
            if (raw.includes('\\')) {
                return `${resolved}\\${raw.substring(firstPart.length + 1)}`;
            }
            return resolved;
        }

        // Fall back to current namespace + raw name
        const ns = this.options.namespace ?? this.options.parent;
        const namespaceName = ns?.kind === 'namespace' ? ns.name : undefined;
        if (namespaceName) {
            return `${namespaceName}\\${raw}`;
        }

        return raw;
    }

    get parent(): PhpAstNodeWrapper | undefined {
        return this.options.parent;
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
        return (
            this.ast.arguments?.map((ast: AST) => {
                return new PhpAstNodeWrapper(ast, { ...this.options, parent: this });
            }) ?? []
        );
    }

    get name(): string {
        if (this.ast.kind === 'namedargument') {
            const astValue = this.ast.value as unknown as AST;
            if (astValue.kind === 'string') {
                return astValue.value ?? '';
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
            return this.ast.value ?? '';
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
        const loc = this.ast.loc;
        if (!loc) {
            return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
        }
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.end.line, character: loc.end.column };

        return { start, end };
    }

    getClasses() {
        const definitions: PhpAstNodeWrapper[] =
            this.kind !== 'program'
                ? []
                : this.getNamespaces().reduce((definitions, definition: PhpAstNodeWrapper) => {
                      return definitions.concat(definition.getClasses());
                  }, [] as PhpAstNodeWrapper[]);

        const options = { ...this.options };
        if (this.kind === 'namespace') {
            options.parent = this;
            options.namespace = this;
        } else if (this.kind === 'program') {
            options.namespace = this;
        }

        return definitions.concat(
            (this.ast.children ?? [])
                .map((node: Node) => new PhpAstNodeWrapper(node, options))
                .filter((definition: PhpAstNodeWrapper) => definition.kind === 'class'),
        );
    }

    getFunctions(): PhpAstNodeWrapper[] {
        const args = this.arguments;

        if (this.type === TestType.describe) {
            return args[1].getFunctions();
        }

        if (args.length > 1 && args[1].kind === 'namedargument') {
            return args[1].getFunctions();
        }

        if (args.length > 1 && args[1].kind === 'arrowfunc') {
            return [new PhpAstNodeWrapper(this.ast, this.options)];
        }

        if (['closure', 'arrowfunc'].includes(this.kind) && this.ast.body) {
            return new PhpAstNodeWrapper(
                this.ast.body as unknown as AST,
                this.options,
            ).getFunctions();
        }

        if (this.kind === 'namedargument') {
            return new PhpAstNodeWrapper(
                (this.ast.value as unknown as AST).body as unknown as AST,
                this.options,
            ).getFunctions();
        }

        return collectPestFunctions(this.ast.children ?? [], this.options, this);
    }

    isTest() {
        if (this.ast.isAbstract) {
            return false;
        }

        if (this.kind === 'class') {
            return (
                this.name.endsWith('Test') &&
                (this.children?.some((definition): boolean => definition.isTest()) ?? false)
            );
        }

        if (this.kind === 'method' && this.acceptModifier()) {
            return (
                this.name.startsWith('test') ||
                annotationParser.isTest(this.ast as unknown as Method) ||
                attributeParser.isTest(this.ast as unknown as Method)
            );
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

    getAllMethods(): PhpAstNodeWrapper[] {
        return this.getMethods();
    }

    isTestMethod(): boolean {
        if (this.kind !== 'method' || !this.acceptModifier()) {
            return false;
        }

        return (
            this.name.startsWith('test') ||
            annotationParser.isTest(this.ast as unknown as Method) ||
            attributeParser.isTest(this.ast as unknown as Method)
        );
    }

    private resolveUseStatements(): Map<string, string> {
        const useMap = new Map<string, string>();

        // Find the container with use statements (namespace or program node)
        const container = this.options.namespace ?? this.options.parent;
        if (!container) {
            return useMap;
        }

        const children = (container.ast.children ?? []) as AST[];
        for (const child of children) {
            if (child.kind !== 'usegroup') {
                continue;
            }

            const items = (child.items ?? []) as AST[];
            for (const item of items) {
                if (item.kind !== 'useitem') {
                    continue;
                }

                const fqn = typeof item.name === 'string' ? item.name : (item.name as Name)?.name;
                if (!fqn) {
                    continue;
                }

                // alias is the last part of the FQN, or the explicit alias
                const parts = fqn.split('\\');
                const alias = parts[parts.length - 1];
                useMap.set(alias, fqn);
            }
        }

        return useMap;
    }

    private getMethods(): PhpAstNodeWrapper[] {
        if (['program', 'namespace'].includes(this.ast.kind)) {
            return this.getClasses().reduce(
                (definitions: PhpAstNodeWrapper[], definition: PhpAstNodeWrapper) => {
                    return definitions.concat(definition.getMethods());
                },
                [],
            );
        }

        const options = { ...this.options };
        if (this.kind === 'class') {
            options.parent = this;
        }

        return (this.ast.body ?? [])
            .map((node: Node) => new PhpAstNodeWrapper(node, options))
            .filter((definition: PhpAstNodeWrapper) => definition.kind === 'method');
    }

    private getNamespaces() {
        if (this.kind !== 'program') {
            return [];
        }

        return (this.ast.children ?? [])
            .map((node: Node) => new PhpAstNodeWrapper(node, this.options))
            .filter((definition: PhpAstNodeWrapper) => definition.kind === 'namespace');
    }

    private acceptModifier() {
        return ['', 'public'].includes(this.ast.visibility ?? '');
    }
}

function collectPestFunctions(
    children: Node[],
    options: {
        phpUnitXML: PHPUnitXML;
        file: string;
        namespace?: PhpAstNodeWrapper;
        parent?: PhpAstNodeWrapper;
    },
    parentNode: PhpAstNodeWrapper,
): PhpAstNodeWrapper[] {
    return children
        .reduce((flatChildren: AST[], node) => {
            return flatChildren.concat(
                node.kind === 'namespace' ? (node as Namespace).children : [node],
            );
        }, [])
        .reduce((definitions, node: AST) => {
            if (
                !(
                    node.kind === 'expressionstatement' &&
                    (node.expression as AST).kind !== 'include'
                )
            ) {
                return definitions;
            }

            const parent = ['block'].includes(parentNode.kind) ? parentNode.parent : parentNode;
            const opts = { ...options, parent };

            let ast = node.expression as AST;
            while (ast.what) {
                if (ast.what.kind === 'name') {
                    break;
                }
                if (ast.kind === 'call') {
                    opts.parent = new PhpAstNodeWrapper(ast, { ...opts });
                }
                ast = ast.what as AST;
            }

            return definitions.concat(new PhpAstNodeWrapper(ast, opts));
        }, [] as PhpAstNodeWrapper[]);
}
