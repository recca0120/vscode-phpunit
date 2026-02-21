import { type AstNode, getAstChildren, type UseGroupNode } from './AstNode';

export class FQNResolver {
    private useMap?: Map<string, string>;

    constructor(
        private readonly ast: AstNode,
        private readonly namespaceName: string | undefined,
    ) {}

    resolve(raw: string): string {
        if (raw.startsWith('\\')) {
            return raw.substring(1);
        }

        const useMap = this.resolveUseStatements();
        const firstPart = raw.split('\\')[0];
        const resolved = useMap.get(firstPart);
        if (resolved) {
            if (raw.includes('\\')) {
                return `${resolved}\\${raw.substring(firstPart.length + 1)}`;
            }
            return resolved;
        }

        if (this.namespaceName) {
            return `${this.namespaceName}\\${raw}`;
        }

        return raw;
    }

    private resolveUseStatements(): Map<string, string> {
        if (this.useMap) {
            return this.useMap;
        }

        this.useMap = new Map<string, string>();

        const children = getAstChildren(this.ast);
        for (const child of children) {
            if (child.kind !== 'namespace_use_declaration') {
                continue;
            }

            for (const item of (child as UseGroupNode).items) {
                const fqn = item.name;
                const parts = fqn.split('\\');
                const alias = parts[parts.length - 1];
                this.useMap.set(alias, fqn);
            }
        }

        return this.useMap;
    }
}
