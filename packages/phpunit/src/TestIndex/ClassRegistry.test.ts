import { describe, expect, it } from 'vitest';
import type { ClassInfo } from '../TestParser/ClassInfo';
import { ClassRegistry } from './ClassRegistry';

const classInfo = (
    overrides: Partial<ClassInfo> & Pick<ClassInfo, 'uri' | 'classFQN'>,
): ClassInfo => ({
    traitFQNs: [],
    traitAdaptations: [],
    kind: 'class',
    isAbstract: false,
    methods: [],
    ...overrides,
});

describe('ClassRegistry', () => {
    it('should register and retrieve class info', () => {
        const registry = new ClassRegistry();
        registry.register(
            classInfo({
                uri: '/test.php',
                classFQN: 'App\\MyClass',
                parentFQN: 'App\\BaseClass',
            }),
        );

        const info = registry.get('App\\MyClass');
        expect(info).toBeDefined();
        expect(info?.parentFQN).toBe('App\\BaseClass');
    });
    it('should find child classes', () => {
        const registry = new ClassRegistry();
        registry.register(classInfo({ uri: '/parent.php', classFQN: 'Parent', isAbstract: true }));
        registry.register(
            classInfo({ uri: '/child1.php', classFQN: 'Child1', parentFQN: 'Parent' }),
        );
        registry.register(
            classInfo({ uri: '/child2.php', classFQN: 'Child2', parentFQN: 'Parent' }),
        );

        const children = registry.childrenOf('Parent');
        expect(children).toHaveLength(2);
    });
    it('should get classes by URI', () => {
        const registry = new ClassRegistry();
        registry.register(classInfo({ uri: '/test.php', classFQN: 'ClassA' }));
        registry.register(classInfo({ uri: '/test.php', classFQN: 'ClassB' }));
        registry.register(classInfo({ uri: '/other.php', classFQN: 'ClassC' }));

        const classes = registry.declaredIn('/test.php');
        expect(classes).toHaveLength(2);
    });
    it('usersOf returns classes that use a trait', () => {
        const registry = new ClassRegistry();
        registry.register(
            classInfo({
                uri: '/trait.php',
                classFQN: 'MyTrait',
                kind: 'trait',
            }),
        );
        registry.register(
            classInfo({
                uri: '/c1.php',
                classFQN: 'C1',
                traitFQNs: ['MyTrait'],
            }),
        );
        registry.register(
            classInfo({
                uri: '/c2.php',
                classFQN: 'C2',
                traitFQNs: ['MyTrait'],
            }),
        );
        registry.register(
            classInfo({
                uri: '/c3.php',
                classFQN: 'C3',
            }),
        );

        const users = registry.usersOf('MyTrait');
        expect(users).toHaveLength(2);
        expect(users.map((u) => u.classFQN)).toEqual(expect.arrayContaining(['C1', 'C2']));
    });
});
