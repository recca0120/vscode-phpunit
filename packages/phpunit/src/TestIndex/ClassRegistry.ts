import { sep } from 'node:path';
import type { ClassInfo } from '../TestParser/ClassInfo';

const withLowerDrive = (path: string) => path.replace(/^[A-Z]:/, (drive) => drive.toLowerCase());

export class ClassRegistry {
    private registry = new Map<string, ClassInfo>();

    clear(): void {
        this.registry.clear();
    }

    register(info: ClassInfo): void {
        this.registry.set(info.classFQN, info);
    }

    unregisterPath(uri: string): ClassInfo[] {
        const path = withLowerDrive(uri);
        const removed = this.filterValues((info) => {
            const declared = withLowerDrive(info.uri);
            return declared === path || declared.startsWith(`${path}${sep}`);
        });
        for (const info of removed) {
            this.registry.delete(info.classFQN);
        }
        return removed;
    }

    get(classFQN: string): ClassInfo | undefined {
        return this.registry.get(classFQN);
    }

    declaredIn(uri: string): ClassInfo[] {
        const path = withLowerDrive(uri);
        return this.filterValues((info) => withLowerDrive(info.uri) === path);
    }

    childrenOf(classFQN: string): ClassInfo[] {
        return this.filterValues((info) => info.parentFQN === classFQN);
    }

    usersOf(traitFQN: string): ClassInfo[] {
        return this.filterValues((info) => info.traitFQNs.includes(traitFQN));
    }

    dependentsOf(classes: ClassInfo[]): ClassInfo[] {
        const dependents = new Map<string, ClassInfo>();
        const pending = [...classes];
        for (let classInfo = pending.shift(); classInfo; classInfo = pending.shift()) {
            for (const dependent of [
                ...this.childrenOf(classInfo.classFQN),
                ...this.usersOf(classInfo.classFQN),
            ]) {
                if (dependents.has(dependent.classFQN)) {
                    continue;
                }
                dependents.set(dependent.classFQN, dependent);
                pending.push(dependent);
            }
        }

        return [...dependents.values()];
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
