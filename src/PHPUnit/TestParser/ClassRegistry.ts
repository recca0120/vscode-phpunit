import type { TestDefinition } from '../types';

export interface ClassInfo {
    uri: string;
    classFQN: string;
    parentFQN?: string;
    isAbstract: boolean;
    methods: TestDefinition[];
}

export class ClassRegistry {
    private registry = new Map<string, ClassInfo>();

    clear(): void {
        this.registry.clear();
    }

    register(info: ClassInfo): void {
        this.registry.set(info.classFQN, info);
    }

    get(classFQN: string): ClassInfo | undefined {
        return this.registry.get(classFQN);
    }

    deleteByUri(uri: string): void {
        for (const [key, info] of this.registry) {
            if (info.uri === key || info.uri === uri) {
                this.registry.delete(key);
            }
        }
    }

    extendsTestCase(classFQN: string): boolean {
        const visited = new Set<string>();
        let current: string | undefined = classFQN;

        while (current) {
            if (current === 'PHPUnit\\Framework\\TestCase') {
                return true;
            }

            if (visited.has(current)) {
                return false;
            }
            visited.add(current);

            const info = this.registry.get(current);
            if (!info) {
                return false;
            }

            current = info.parentFQN;
        }

        return false;
    }

    resolveInheritedMethods(classFQN: string): TestDefinition[] {
        const visited = new Set<string>();
        const methodMap = new Map<string, TestDefinition>();
        let current: string | undefined = classFQN;

        while (current) {
            if (visited.has(current)) {
                break;
            }
            visited.add(current);

            const info = this.registry.get(current);
            if (!info) {
                break;
            }

            for (const method of info.methods) {
                if (method.methodName && !methodMap.has(method.methodName)) {
                    methodMap.set(method.methodName, method);
                }
            }

            current = info.parentFQN;
        }

        return [...methodMap.values()];
    }

    getClassesByUri(uri: string): ClassInfo[] {
        const result: ClassInfo[] = [];
        for (const info of this.registry.values()) {
            if (info.uri === uri) {
                result.push(info);
            }
        }
        return result;
    }

    getChildClasses(classFQN: string): ClassInfo[] {
        const children: ClassInfo[] = [];
        for (const info of this.registry.values()) {
            if (info.parentFQN === classFQN) {
                children.push(info);
            }
        }
        return children;
    }
}
