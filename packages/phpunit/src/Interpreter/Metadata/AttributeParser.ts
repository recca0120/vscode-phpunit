import type { AstNode, AstNodeAttrGroup, ClassNode, MethodNode } from '../AstParser/AstNode';
import type { CloneMode, Metadata } from './Metadata';
import type { MetadataParser } from './MetadataParser';

const NAMESPACE = 'PHPUnit\\Framework\\Attributes\\';

type ResolveFQN = (name: string) => string;
type Factory = (args: AttributeArguments) => Metadata | undefined;

const group =
    (parameter: string): Factory =>
    (args) => {
        const name = args.string(0, parameter);
        return name ? { kind: 'group', name } : undefined;
    };

const size =
    (name: string): Factory =>
    () => ({ kind: 'group', name });

const dependsOnMethod =
    (clone: CloneMode): Factory =>
    (args) => {
        const methodName = args.string(0, 'methodName');
        return methodName ? { kind: 'dependsOnMethod', methodName, clone } : undefined;
    };

const dependsExternal =
    (clone: CloneMode): Factory =>
    (args) => {
        const className = args.className(0, 'className');
        const methodName = args.string(1, 'methodName');
        return className && methodName
            ? { kind: 'dependsOnMethod', className, methodName, clone }
            : undefined;
    };

const dependsOnClass =
    (clone: CloneMode): Factory =>
    (args) => {
        const className = args.className(0, 'className');
        return className ? { kind: 'dependsOnClass', className, clone } : undefined;
    };

const FACTORIES: Record<string, Factory> = {
    Test: () => ({ kind: 'test' }),
    Group: group('name'),
    Ticket: group('text'),
    Small: size('small'),
    Medium: size('medium'),
    Large: size('large'),
    TestDox: (args) => {
        const text = args.string(0, 'text');
        return text ? { kind: 'testDox', text } : undefined;
    },
    TestWith: (args) => ({
        kind: 'testWith',
        data: args.node(0, 'data'),
        name: args.string(1, 'name'),
    }),
    TestWithJson: (args) => ({ kind: 'testWith', data: args.string(0, 'json') }),
    DataProvider: (args) => {
        const methodName = args.string(0, 'methodName');
        return methodName ? { kind: 'dataProvider', methodName } : undefined;
    },
    DataProviderExternal: (args) => {
        const className = args.className(0, 'className');
        const methodName = args.string(1, 'methodName');
        return className && methodName
            ? { kind: 'dataProvider', className, methodName }
            : undefined;
    },
    Depends: dependsOnMethod('none'),
    DependsUsingDeepClone: dependsOnMethod('deep'),
    DependsUsingShallowClone: dependsOnMethod('shallow'),
    DependsExternal: dependsExternal('none'),
    DependsExternalUsingDeepClone: dependsExternal('deep'),
    DependsExternalUsingShallowClone: dependsExternal('shallow'),
    DependsOnClass: dependsOnClass('none'),
    DependsOnClassUsingDeepClone: dependsOnClass('deep'),
    DependsOnClassUsingShallowClone: dependsOnClass('shallow'),
};

export class AttributeParser implements MetadataParser {
    constructor(private resolveFQN: ResolveFQN) {}

    forClass(node: ClassNode): Metadata[] {
        return this.parse(node.attrGroups);
    }

    forMethod(node: MethodNode): Metadata[] {
        return this.parse(node.attrGroups);
    }

    private parse(groups: AstNodeAttrGroup[] = []): Metadata[] {
        return groups
            .flatMap((attrGroup) => attrGroup.attrs)
            .flatMap((attr) => {
                const fqn = this.resolveFQN(attr.name);
                if (!fqn.startsWith(NAMESPACE)) {
                    return [];
                }

                const metadata = FACTORIES[fqn.slice(NAMESPACE.length)]?.(
                    new AttributeArguments(attr.args, this.resolveFQN),
                );
                return metadata ? [metadata] : [];
            });
    }
}

class AttributeArguments {
    constructor(
        private args: AstNode[],
        private resolveFQN: ResolveFQN,
    ) {}

    node(position: number, name: string): AstNode | undefined {
        const named = this.args.find((arg) => arg.kind === 'argument' && arg.name === name);
        if (named?.kind === 'argument') {
            return named.value;
        }
        return this.args.filter((arg) => arg.kind !== 'argument')[position];
    }

    string(position: number, name: string): string | undefined {
        const node = this.node(position, name);
        if (node?.kind === 'string') {
            return node.value;
        }
        if (node?.kind === 'number') {
            return String(node.value);
        }
        return undefined;
    }

    className(position: number, name: string): string | undefined {
        const node = this.node(position, name);
        if (node?.kind === 'class_constant_access' && node.name === 'class') {
            return this.resolveFQN(node.scope);
        }
        return node?.kind === 'string' ? node.value : undefined;
    }
}
