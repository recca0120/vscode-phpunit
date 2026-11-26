import { sep } from 'node:path';
import type { ClassInfo } from '../TestParser/ClassInfo';

export class ClassRegistry {
    private registry = new Map<string, ClassInfo>();

    clear(): void {
        this.registry.clear();
    }

    register(info: ClassInfo): void {
        this.registry.set(info.classFQN, info);
    }

    unregister(uri: string): ClassInfo[] {
        const removed = this.filterValues(
            (info) => info.uri === uri || info.uri.startsWith(`${uri}${sep}`),
        );
        for (const info of removed) {
            this.registry.delete(info.classFQN);
        }
        return removed;
    }

    get(classFQN: string): ClassInfo | undefined {
        return this.registry.get(classFQN);
    }

    getClassesByUri(uri: string): ClassInfo[] {
        return this.filterValues((info) => info.uri === uri);
    }

    getChildClasses(classFQN: string): ClassInfo[] {
        return this.filterValues((info) => info.parentFQN === classFQN);
    }

    getTraitUsers(traitFQN: string): ClassInfo[] {
        return this.filterValues((info) => info.traitFQNs.includes(traitFQN));
    }

    private filterValues(predicate: (info: ClassInfo) => boolean): ClassInfo[] {
        const result: ClassInfo[] = [];
        for (const info of this.registry.values()) {
            if (predicate(info)) {
                result.push(info);
            }
        }
        return result;
    }
}
