import { ClassRegistry } from '../TestIndex/ClassRegistry';
import { InheritanceResolver } from '../TestIndex/InheritanceResolver';
import type { TestDefinition } from '../types';
import type { ClassInfo } from './ClassInfo';

export class ClassHierarchy {
    private readonly classes = new ClassRegistry();
    private readonly inheritance = new InheritanceResolver(this.classes);

    clear(): void {
        this.classes.clear();
    }

    register(info: ClassInfo): void {
        this.classes.register(info);
    }

    unregister(uri: string): ClassInfo[] {
        return this.classes.unregister(uri);
    }

    get(classFQN: string): ClassInfo | undefined {
        return this.classes.get(classFQN);
    }

    mayExtendTestCase(classFQN: string): boolean {
        return this.inheritance.mayExtendTestCase(classFQN);
    }

    resolveInheritedMethods(classFQN: string): TestDefinition[] {
        return this.inheritance.resolveInheritedMethods(classFQN);
    }

    enrichTests(tests: TestDefinition[]): TestDefinition[] {
        return this.inheritance.enrichTests(tests);
    }

    getClassesByUri(uri: string): ClassInfo[] {
        return this.classes.getClassesByUri(uri);
    }

    getChildClasses(classFQN: string): ClassInfo[] {
        return this.classes.getChildClasses(classFQN);
    }

    getTraitUsers(traitFQN: string): ClassInfo[] {
        return this.classes.getTraitUsers(traitFQN);
    }
}
