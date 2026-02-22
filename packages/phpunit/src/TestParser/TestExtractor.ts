import { TestIdentifierFactory } from '../TestIdentifier';
import { type Annotations, type TestDefinition, TestType } from '../types';
import { splitFQN } from '../utils';
import type { ClassInfo } from './ClassHierarchy';
import type {
    ClassDescriptor,
    FileInfo,
    PestCallDescriptor,
    Range,
    TraitAdaptation,
} from './Interpreter/types';
import { generatePestClassFQN } from './PestClassFQNGenerator';

export interface ParseResult {
    tests: TestDefinition[];
    classes: ClassInfo[];
}

export function extractTests(
    fileInfo: FileInfo,
    file: string,
    root: string,
): ParseResult | undefined {
    const pestResult = extractPestTests(fileInfo, file, root);
    if (pestResult) {
        return pestResult;
    }

    return extractPhpUnitTests(fileInfo, file);
}

function extractPhpUnitTests(fileInfo: FileInfo, file: string): ParseResult | undefined {
    const testDefinitions: TestDefinition[] = [];
    const classes: ClassInfo[] = [];

    for (const cls of fileInfo.classes) {
        const testMethods = cls.methods.filter((m) => m.isTestMethod);

        const { namespace } = splitFQN(cls.fqn);
        const transformer = TestIdentifierFactory.create(cls.fqn);

        const traitFQNs = cls.traitUses.map((t) => t.traitFQN);
        const traitAdaptations: TraitAdaptation[] = cls.traitUses.flatMap((t) => t.adaptations);

        classes.push({
            uri: file,
            classFQN: cls.fqn,
            parentFQN: cls.parentFQN,
            traitFQNs,
            traitAdaptations,
            kind: cls.isTrait ? 'trait' : 'class',
            isAbstract: cls.isAbstract,
            methods: testMethods.map((m) => buildMethodDef(cls, m, file, namespace, transformer)),
        });

        if (cls.isAbstract || cls.isTrait) {
            continue;
        }

        const children = cls.methods
            .filter((m) => !m.isAbstract && m.isTestMethod)
            .map((m) => {
                const def = buildMethodDef(cls, m, file, namespace, transformer);
                if (m.dataProviderLabels.length > 0) {
                    def.annotations = { ...def.annotations, dataset: m.dataProviderLabels };
                }
                return def;
            });

        const classDef = buildDef(transformer, {
            type: TestType.class,
            classFQN: cls.fqn,
            namespace,
            className: cls.name,
            children,
            annotations: cls.annotations,
            file,
            start: cls.range.start,
            end: cls.range.end,
        });

        if (namespace) {
            let nsDef = testDefinitions.find(
                (d) => d.type === TestType.namespace && d.namespace === namespace,
            );
            if (!nsDef) {
                const nsTransformer = TestIdentifierFactory.create(namespace);
                nsDef = buildDef(nsTransformer, {
                    type: TestType.namespace,
                    classFQN: namespace,
                    namespace,
                    children: [],
                    annotations: {},
                    file,
                    ...(fileInfo.namespaceRange && {
                        start: fileInfo.namespaceRange.start,
                        end: fileInfo.namespaceRange.end,
                    }),
                });
                testDefinitions.push(nsDef);
            }
            (nsDef.children as TestDefinition[]).push(classDef);
        } else {
            testDefinitions.push(classDef);
        }
    }

    if (testDefinitions.length === 0 && classes.length === 0) {
        return undefined;
    }

    return { tests: testDefinitions, classes };
}

function extractPestTests(fileInfo: FileInfo, file: string, root: string): ParseResult | undefined {
    if (fileInfo.pestCalls.length === 0) {
        return undefined;
    }

    const testCalls = fileInfo.pestCalls.filter((c) =>
        ['test', 'it', 'describe', 'arch'].includes(c.fnName),
    );
    if (testCalls.length === 0) {
        return undefined;
    }

    const classFQN = generatePestClassFQN(root, file);
    const { namespace, className } = splitFQN(classFQN);
    const transformer = TestIdentifierFactory.create(classFQN);

    const programRange = fileInfo.programRange;
    const pestCtx: PestContext = { classFQN, namespace, className, file, transformer };
    const children = testCalls.map((call) => buildPestTestDef(call, pestCtx, []));

    if (children.length === 0) {
        return undefined;
    }

    const suiteDef = buildDef(transformer, {
        type: TestType.class,
        classFQN,
        namespace,
        className,
        children,
        annotations: {},
        file,
        start: programRange.start,
        end: programRange.end,
    });

    const nsDef = buildDef(transformer, {
        type: TestType.namespace,
        classFQN: namespace,
        namespace,
        children: [suiteDef],
        annotations: {},
        file,
        start: programRange.start,
        end: programRange.end,
    });

    return { tests: [nsDef], classes: [] };
}

interface PestContext {
    classFQN: string;
    namespace: string;
    className: string;
    file: string;
    transformer: ReturnType<typeof TestIdentifierFactory.create>;
}

function resolvePestMethodName(call: PestCallDescriptor): { methodName: string; label: string } {
    if (call.fnName === 'arch' && call.description === undefined) {
        const names = call.chainCalls;
        const methodName = names
            .map((name: string) => (name === 'preset' ? `${name}  ` : ` ${name} `))
            .join('→');
        return { methodName, label: names.join(' → ') };
    }

    if (call.description !== undefined) {
        const methodName = call.fnName === 'it' ? `it ${call.description}` : call.description;
        return { methodName, label: methodName };
    }

    return { methodName: call.fnName, label: call.fnName };
}

function buildPestTestDef(
    call: PestCallDescriptor,
    ctx: PestContext,
    describeChain: string[],
): TestDefinition {
    const isDescribe = call.fnName === 'describe';
    let { methodName, label } = resolvePestMethodName(call);

    if (isDescribe) {
        methodName = `\`${methodName}\``;
    }

    if (describeChain.length > 0) {
        methodName = [...describeChain, methodName].join(' → ');
    }

    const type = isDescribe ? TestType.describe : TestType.method;
    const annotations: Annotations = {};

    if (call.datasets.length > 0) {
        annotations.dataset = call.datasets;
    }

    const def = buildDef(ctx.transformer, {
        type,
        classFQN: ctx.classFQN,
        namespace: ctx.namespace,
        className: ctx.className,
        methodName,
        label,
        children: [],
        annotations,
        file: ctx.file,
        start: call.range.start,
        end: call.range.end,
    });

    if (isDescribe) {
        const newChain = [...describeChain, `\`${call.description}\``];
        def.children = call.children.map((child) => buildPestTestDef(child, ctx, newChain));
    }

    return def;
}

function buildDef(
    transformer: ReturnType<typeof TestIdentifierFactory.create>,
    base: Omit<TestDefinition, 'id' | 'label'> & { label?: string },
): TestDefinition {
    const def: TestDefinition = {
        ...base,
        id: '',
        label: '',
    };
    def.id = transformer.uniqueId(def);
    def.label = base.label
        ? transformer.generateLabel({ ...def, label: base.label })
        : transformer.generateLabel(def);
    return def;
}

function buildMethodDef(
    cls: ClassDescriptor,
    method: { name: string; annotations: Record<string, unknown>; range: Range },
    file: string,
    namespace: string | undefined,
    transformer: ReturnType<typeof TestIdentifierFactory.create>,
): TestDefinition {
    return buildDef(transformer, {
        type: TestType.method,
        classFQN: cls.fqn,
        namespace,
        className: cls.name,
        methodName: method.name,
        children: [],
        annotations: method.annotations,
        file,
        start: method.range.start,
        end: method.range.end,
    });
}
