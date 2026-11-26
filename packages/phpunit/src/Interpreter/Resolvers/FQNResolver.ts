import type { PHP } from '../PHP';
import type { FileInfo, Range, Resolver } from '../types';
import { type NamespaceScope, NamespaceVisitor } from '../Visitors/NamespaceVisitor';

export class FQNResolver implements Resolver {
    private _scopes: readonly NamespaceScope[] = [];

    get namespace(): string | undefined {
        return this._scopes[0]?.name;
    }

    get namespaceRange(): Range | undefined {
        return this._scopes[0]?.range;
    }

    reset(): void {
        this._scopes = [];
    }

    resolve(php: PHP): void {
        this._scopes = php.getVisitor(NamespaceVisitor).scopes;
    }

    contribute(result: Partial<FileInfo>): void {
        result.namespace = this.namespace;
        result.namespaceRange = this.namespaceRange;
    }

    resolveFQN(raw: string, scope: NamespaceScope | undefined = this._scopes[0]): string {
        if (raw.startsWith('\\')) {
            return raw.substring(1);
        }

        const firstPart = raw.split('\\')[0];
        const resolved = scope?.useMap.get(firstPart);
        if (resolved) {
            if (raw.includes('\\')) {
                return `${resolved}\\${raw.substring(firstPart.length + 1)}`;
            }
            return resolved;
        }

        if (scope?.name) {
            return `${scope.name}\\${raw}`;
        }

        return raw;
    }
}
