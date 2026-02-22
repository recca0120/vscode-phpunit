import type { PHPUnitXML } from '../Configuration';
import { type TestDefinition, TestType } from '../types';
import { AnnotationParser } from './AnnotationParser';
import {
    type ArgumentNode,
    type ArrowFuncNode,
    type AstNode,
    type ClassNode,
    type ClosureNode,
    getAstChildren,
    type MethodNode,
} from './AstNode';
import { AttributeParser } from './AttributeParser';
import type { TraitAdaptation } from './ClassHierarchy';
import { FQNResolver } from './FQNResolver';
import { generatePestClassFQN } from './PestClassFQNGenerator';
import {
    buildNamespaceDefinition,
    buildPestTestDefinition,
    buildTestCaseDefinition,
    buildTestSuiteDefinition,
} from './TestDefinitionBuilder';
import { parseTraitUses } from './TraitUseParser';

const annotationParser = new AnnotationParser();
const attributeParser = new AttributeParser();

export class TestNode {
    constructor(
        private readonly ast: AstNode,
        readonly options: {
            phpUnitXML: PHPUnitXML;
            file: string;
            namespace?: TestNode;
            parent?: TestNode;
            fqnResolver?: FQNResolver;
        },
    ) {}

    clone(): TestNode {
        return new TestNode(this.ast, this.options);
    }

    createChild(childAst: AstNode): TestNode {
        return new TestNode(childAst, this.options);
    }

    get node(): AstNode {
        return this.ast;
    }

    get astChildren(): AstNode[] {
        return getAstChildren(this.ast);
    }

    getCallableBody(): TestNode | undefined {
        if (this.kind === 'anonymous_function' || this.kind === 'arrow_function') {
            return this.createChild((this.ast as ClosureNode | ArrowFuncNode).body);
        }

        if (this.kind === 'argument') {
            const val = (this.ast as ArgumentNode).value;
            if (val.kind === 'anonymous_function' || val.kind === 'arrow_function') {
                return this.createChild((val as ClosureNode | ArrowFuncNode).body);
            }
        }

        return undefined;
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
        if (this.kind === 'namespace_definition') {
            return TestType.namespace;
        }

        if (['program', 'class_declaration', 'trait_declaration'].includes(this.kind)) {
            return TestType.class;
        }

        if (this.kind === 'method_declaration') {
            return TestType.method;
        }

        if (this.kind === 'function_call_expression') {
            return this.name === 'describe' ? TestType.describe : TestType.method;
        }

        return undefined;
    }

    get classFQN(): string | undefined {
        if (this.kind === 'program') {
            return generatePestClassFQN(this.root, this.file);
        }

        if (this.kind === 'namespace_definition') {
            return this.name;
        }

        if (this.kind === 'class_declaration' || this.kind === 'trait_declaration') {
            return [this.parent?.name, this.name].filter((name) => !!name).join('\\');
        }

        return this.parent?.classFQN;
    }

    get isTrait(): boolean {
        return this.kind === 'trait_declaration';
    }

    get isAbstract(): boolean {
        if (
            this.ast.kind === 'class_declaration' ||
            this.ast.kind === 'trait_declaration' ||
            this.ast.kind === 'method_declaration'
        ) {
            return this.ast.isAbstract;
        }
        return false;
    }

    get extendsName(): string | undefined {
        if (this.ast.kind === 'class_declaration' || this.ast.kind === 'trait_declaration') {
            return (this.ast as ClassNode).extendsName;
        }
        return undefined;
    }

    get parentFQN(): string | undefined {
        if (this.kind !== 'class_declaration') {
            return undefined;
        }

        const raw = this.extendsName;
        if (!raw) {
            return undefined;
        }

        return this.resolveFQN(raw);
    }

    get parent(): TestNode | undefined {
        return this.options.parent;
    }

    get children() {
        if (this.kind === 'namespace_definition') {
            return this.getClasses();
        }

        if (this.kind === 'class_declaration' || this.kind === 'trait_declaration') {
            return this.getMethods();
        }

        return undefined;
    }

    get arguments() {
        if (this.ast.kind === 'function_call_expression') {
            return this.ast.arguments.map((ast: AstNode) => {
                return new TestNode(ast, { ...this.options, parent: this });
            });
        }
        return [];
    }

    get name(): string {
        const ast = this.ast;

        if (ast.kind === 'argument') {
            const val = ast.value;
            return val.kind === 'string' ? (val.value ?? '') : '';
        }

        if (ast.kind === 'string') {
            return ast.value ?? '';
        }

        if (ast.kind === 'function_call_expression') {
            return ast.name;
        }

        if (
            ast.kind === 'namespace_definition' ||
            ast.kind === 'class_declaration' ||
            ast.kind === 'trait_declaration' ||
            ast.kind === 'method_declaration'
        ) {
            return ast.name;
        }

        return '';
    }

    get annotations() {
        if (
            this.ast.kind !== 'class_declaration' &&
            this.ast.kind !== 'trait_declaration' &&
            this.ast.kind !== 'method_declaration'
        ) {
            return {};
        }

        const node = this.ast as ClassNode | MethodNode;
        return {
            ...annotationParser.parse(node),
            ...attributeParser.parse(node),
        };
    }

    get position() {
        const loc = this.ast.loc;
        if (!loc) {
            return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
        }
        const start = { line: loc.start.row + 1, character: loc.start.column };
        const end = { line: loc.end.row + 1, character: loc.end.column };

        return { start, end };
    }

    getClasses() {
        const definitions: TestNode[] =
            this.kind !== 'program' ? [] : this.getNamespaces().flatMap((ns) => ns.getClasses());

        const options = { ...this.options };
        if (this.kind === 'namespace_definition') {
            options.parent = this;
            options.namespace = this;
            options.fqnResolver = new FQNResolver(this.ast, this.name);
        } else if (this.kind === 'program') {
            options.namespace = this;
            options.fqnResolver = new FQNResolver(this.ast, undefined);
        }

        const children = getAstChildren(this.ast);
        return definitions.concat(
            this.filterChildrenByKind(
                children,
                ['class_declaration', 'trait_declaration'],
                options,
            ),
        );
    }

    isTest() {
        if (this.isAbstract) {
            return false;
        }

        if (this.kind === 'trait_declaration') {
            return false;
        }

        if (this.kind === 'class_declaration') {
            return (
                this.name.endsWith('Test') &&
                (this.children?.some((definition): boolean => definition.isTest()) ?? false)
            );
        }

        if (this.kind === 'method_declaration' && this.acceptModifier()) {
            return this.isTestMethod();
        }

        if (this.kind === 'function_call_expression') {
            return ['it', 'test', 'describe', 'arch'].includes(this.name);
        }

        return false;
    }

    toTestDefinition(): TestDefinition {
        if (this.kind === 'class_declaration') {
            return buildTestSuiteDefinition(this);
        }

        if (this.kind === 'method_declaration') {
            return buildTestCaseDefinition(this);
        }

        return buildPestTestDefinition(this);
    }

    createNamespaceTestDefinition(): TestDefinition {
        return buildNamespaceDefinition(this);
    }

    isTestMethod(): boolean {
        if (this.kind !== 'method_declaration' || !this.acceptModifier()) {
            return false;
        }

        const method = this.ast as MethodNode;
        return (
            this.name.startsWith('test') ||
            annotationParser.isTest(method) ||
            attributeParser.isTest(method)
        );
    }

    getTraitUses(): { traitFQNs: string[]; adaptations: TraitAdaptation[] } {
        if (this.ast.kind !== 'class_declaration' && this.ast.kind !== 'trait_declaration') {
            return { traitFQNs: [], adaptations: [] };
        }

        return parseTraitUses(this.ast.body, (raw) => this.resolveFQN(raw));
    }

    getMethods(): TestNode[] {
        if (['program', 'namespace_definition'].includes(this.ast.kind)) {
            return this.getClasses().flatMap((cls) => cls.getMethods());
        }

        const options = { ...this.options };
        if (this.kind === 'class_declaration' || this.kind === 'trait_declaration') {
            options.parent = this;
        }

        const body =
            this.ast.kind === 'class_declaration' || this.ast.kind === 'trait_declaration'
                ? this.ast.body
                : [];
        return this.filterChildrenByKind(body, 'method_declaration', options);
    }

    private resolveFQN(raw: string): string {
        if (this.options.fqnResolver) {
            return this.options.fqnResolver.resolve(raw);
        }

        const container = this.options.namespace ?? this.options.parent;
        const namespaceName =
            container?.kind === 'namespace_definition' ? container.name : undefined;
        const resolverAst = container?.ast ?? this.ast;

        this.options.fqnResolver = new FQNResolver(resolverAst, namespaceName);

        return this.options.fqnResolver.resolve(raw);
    }

    private getNamespaces() {
        if (this.kind !== 'program') {
            return [];
        }

        return this.filterChildrenByKind(
            getAstChildren(this.ast),
            'namespace_definition',
            this.options,
        );
    }

    private filterChildrenByKind(
        source: AstNode[],
        kind: string | string[],
        options: typeof this.options,
    ): TestNode[] {
        const kinds = Array.isArray(kind) ? kind : [kind];
        return source
            .filter((node) => kinds.includes(node.kind))
            .map((node) => new TestNode(node, options));
    }

    private acceptModifier() {
        if (this.ast.kind === 'method_declaration') {
            return ['', 'public'].includes(this.ast.visibility ?? '');
        }
        return true;
    }
}
