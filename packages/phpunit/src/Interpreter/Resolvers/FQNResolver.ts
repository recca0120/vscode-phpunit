import type { PHP } from '../PHP';
import type { FileInfo, Range, Resolver } from '../types';
import { NamespaceVisitor } from '../Visitors/NamespaceVisitor';

export class FQNResolver implements Resolver {
    private _namespace?: string;
    private _namespaceRange?: Range;
    private _useMap: ReadonlyMap<string, string> = new Map();

    get namespace(): string | undefined {
        return this._namespace;
    }

    get namespaceRange(): Range | undefined {
        return this._namespaceRange;
    }

    reset(): void {
        this._namespace = undefined;
        this._namespaceRange = undefined;
        this._useMap = new Map();
    }

    resolve(php: PHP): void {
        const visitor = php.getVisitor(NamespaceVisitor);
        this._namespace = visitor.namespace;
        this._namespaceRange = visitor.namespaceRange;
        this._useMap = visitor.useMap;
    }

    contribute(result: Partial<FileInfo>): void {
        result.namespace = this._namespace;
        result.namespaceRange = this._namespaceRange;
    }

    resolveFQN(raw: string): string {
        if (raw.startsWith('\\')) {
            return raw.substring(1);
        }

        const firstPart = raw.split('\\')[0];
        const resolved = this._useMap.get(firstPart);
        if (resolved) {
            if (raw.includes('\\')) {
                return `${resolved}\\${raw.substring(firstPart.length + 1)}`;
            }
            return resolved;
        }

        if (this._namespace) {
            return `${this._namespace}\\${raw}`;
        }

        return raw;
    }
}
