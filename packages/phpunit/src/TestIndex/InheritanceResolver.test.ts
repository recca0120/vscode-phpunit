import { describe, expect, it } from 'vitest';
import type { ClassInfo } from '../TestParser/ClassInfo';
import { TestType } from '../types';
import { ClassRegistry } from './ClassRegistry';
import { InheritanceResolver } from './InheritanceResolver';

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

describe('InheritanceResolver', () => {
    it('should detect TestCase inheritance', () => {
        const registry = new ClassRegistry();
        const resolver = new InheritanceResolver(registry);
        registry.register(
            classInfo({
                uri: '/abstract.php',
                classFQN: 'App\\AbstractTest',
                parentFQN: 'PHPUnit\\Framework\\TestCase',
                isAbstract: true,
            }),
        );
        registry.register(
            classInfo({
                uri: '/concrete.php',
                classFQN: 'App\\ConcreteTest',
                parentFQN: 'App\\AbstractTest',
            }),
        );

        expect(resolver.mayExtendTestCase('App\\ConcreteTest')).toBe(true);
        expect(resolver.mayExtendTestCase('App\\AbstractTest')).toBe(true);
    });

    it('should detect circular inheritance', () => {
        const registry = new ClassRegistry();
        const resolver = new InheritanceResolver(registry);
        registry.register(
            classInfo({
                uri: '/a.php',
                classFQN: 'A',
                parentFQN: 'B',
            }),
        );
        registry.register(
            classInfo({
                uri: '/b.php',
                classFQN: 'B',
                parentFQN: 'A',
            }),
        );

        expect(resolver.mayExtendTestCase('A')).toBe(false);
    });

    it('should not infinite loop on circular inheritance in inheritedMethods', () => {
        const registry = new ClassRegistry();
        const resolver = new InheritanceResolver(registry);
        registry.register(
            classInfo({
                uri: '/a.php',
                classFQN: 'A',
                parentFQN: 'B',
                methods: [{ type: TestType.method, id: 'a', label: 'a', methodName: 'test_a' }],
            }),
        );
        registry.register(
            classInfo({
                uri: '/b.php',
                classFQN: 'B',
                parentFQN: 'A',
                methods: [{ type: TestType.method, id: 'b', label: 'b', methodName: 'test_b' }],
            }),
        );

        const methods = resolver.inheritedMethods('A');
        expect(methods).toHaveLength(2);
        expect(methods.map((m) => m.methodName)).toContain('test_a');
        expect(methods.map((m) => m.methodName)).toContain('test_b');
    });

    it('should resolve inherited methods', () => {
        const registry = new ClassRegistry();
        const resolver = new InheritanceResolver(registry);
        const parentMethod = {
            type: TestType.method,
            id: 'test',
            label: 'test',
            methodName: 'test_parent',
        };
        const childMethod = {
            type: TestType.method,
            id: 'test',
            label: 'test',
            methodName: 'test_child',
        };

        registry.register(
            classInfo({
                uri: '/parent.php',
                classFQN: 'Parent',
                parentFQN: 'PHPUnit\\Framework\\TestCase',
                isAbstract: true,
                methods: [parentMethod],
            }),
        );
        registry.register(
            classInfo({
                uri: '/child.php',
                classFQN: 'Child',
                parentFQN: 'Parent',
                methods: [childMethod],
            }),
        );

        const methods = resolver.inheritedMethods('Child');
        expect(methods).toHaveLength(2);
        expect(methods.map((m) => m.methodName)).toContain('test_child');
        expect(methods.map((m) => m.methodName)).toContain('test_parent');
    });

    it('child override should take precedence in inheritedMethods', () => {
        const registry = new ClassRegistry();
        const resolver = new InheritanceResolver(registry);

        registry.register(
            classInfo({
                uri: '/parent.php',
                classFQN: 'Parent',
                parentFQN: 'PHPUnit\\Framework\\TestCase',
                isAbstract: true,
                methods: [
                    {
                        type: TestType.method,
                        id: 'p',
                        label: 'p',
                        methodName: 'test_shared',
                        file: '/parent.php',
                    },
                ],
            }),
        );
        registry.register(
            classInfo({
                uri: '/child.php',
                classFQN: 'Child',
                parentFQN: 'Parent',
                methods: [
                    {
                        type: TestType.method,
                        id: 'c',
                        label: 'c',
                        methodName: 'test_shared',
                        file: '/child.php',
                    },
                ],
            }),
        );

        const methods = resolver.inheritedMethods('Child');
        expect(methods).toHaveLength(1);
        expect(methods[0].file).toBe('/child.php');
    });

    describe('trait method inheritance', () => {
        const m = (name: string, file = '/trait.php') => ({
            type: TestType.method,
            id: name,
            label: name,
            methodName: name,
            file,
        });

        it('should resolve basic trait methods', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/trait.php',
                    classFQN: 'MyTrait',
                    kind: 'trait',
                    methods: [m('test_from_trait')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['MyTrait'],
                    methods: [m('test_own', '/class.php')],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            expect(methods.map((x) => x.methodName)).toContain('test_from_trait');
            expect(methods.map((x) => x.methodName)).toContain('test_own');
        });

        it('should merge methods from multiple traits', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/t1.php',
                    classFQN: 'T1',
                    kind: 'trait',
                    methods: [m('test_t1')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/t2.php',
                    classFQN: 'T2',
                    kind: 'trait',
                    methods: [m('test_t2')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['T1', 'T2'],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            expect(methods.map((x) => x.methodName)).toEqual(
                expect.arrayContaining(['test_t1', 'test_t2']),
            );
        });

        it('should handle insteadof conflict resolution', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/t1.php',
                    classFQN: 'T1',
                    kind: 'trait',
                    methods: [m('test_shared', '/t1.php'), m('test_t1')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/t2.php',
                    classFQN: 'T2',
                    kind: 'trait',
                    methods: [m('test_shared', '/t2.php'), m('test_t2')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['T1', 'T2'],
                    traitAdaptations: [
                        { kind: 'insteadof', trait: 'T1', method: 'test_shared', instead: ['T2'] },
                    ],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            const shared = methods.find((x) => x.methodName === 'test_shared');
            expect(shared?.file).toBe('/t1.php');
        });

        it('should handle as (alias) adaptation', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/t1.php',
                    classFQN: 'T1',
                    kind: 'trait',
                    methods: [m('test_shared', '/t1.php')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/t2.php',
                    classFQN: 'T2',
                    kind: 'trait',
                    methods: [m('test_shared', '/t2.php')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['T1', 'T2'],
                    traitAdaptations: [
                        { kind: 'insteadof', trait: 'T1', method: 'test_shared', instead: ['T2'] },
                        {
                            kind: 'as',
                            trait: 'T2',
                            method: 'test_shared',
                            alias: 'test_shared_alias',
                        },
                    ],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            const names = methods.map((x) => x.methodName);
            expect(names).toContain('test_shared');
            expect(names).toContain('test_shared_alias');
        });

        it('should resolve nested trait use (trait uses trait)', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/inner.php',
                    classFQN: 'InnerTrait',
                    kind: 'trait',
                    methods: [m('test_inner')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/outer.php',
                    classFQN: 'OuterTrait',
                    kind: 'trait',
                    traitFQNs: ['InnerTrait'],
                    methods: [m('test_outer')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['OuterTrait'],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            const names = methods.map((x) => x.methodName);
            expect(names).toContain('test_inner');
            expect(names).toContain('test_outer');
        });

        it('should not infinite loop on circular trait use', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/ta.php',
                    classFQN: 'TraitA',
                    kind: 'trait',
                    traitFQNs: ['TraitB'],
                    methods: [m('test_a')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/tb.php',
                    classFQN: 'TraitB',
                    kind: 'trait',
                    traitFQNs: ['TraitA'],
                    methods: [m('test_b')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['TraitA'],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            const names = methods.map((x) => x.methodName);
            expect(names).toContain('test_a');
            expect(names).toContain('test_b');
        });

        it('own methods take precedence over trait methods', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/trait.php',
                    classFQN: 'MyTrait',
                    kind: 'trait',
                    methods: [m('test_shared', '/trait.php')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    traitFQNs: ['MyTrait'],
                    methods: [m('test_shared', '/class.php')],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            expect(methods).toHaveLength(1);
            expect(methods[0].file).toBe('/class.php');
        });

        it('trait methods take precedence over parent methods', () => {
            const registry = new ClassRegistry();
            const resolver = new InheritanceResolver(registry);
            registry.register(
                classInfo({
                    uri: '/parent.php',
                    classFQN: 'ParentClass',
                    methods: [m('test_shared', '/parent.php')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/trait.php',
                    classFQN: 'MyTrait',
                    kind: 'trait',
                    methods: [m('test_shared', '/trait.php')],
                }),
            );
            registry.register(
                classInfo({
                    uri: '/class.php',
                    classFQN: 'MyClass',
                    parentFQN: 'ParentClass',
                    traitFQNs: ['MyTrait'],
                }),
            );

            const methods = resolver.inheritedMethods('MyClass');
            const shared = methods.find((x) => x.methodName === 'test_shared');
            expect(shared?.file).toBe('/trait.php');
        });
    });
});
