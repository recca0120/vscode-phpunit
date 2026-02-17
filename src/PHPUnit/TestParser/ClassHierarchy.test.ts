import { describe, expect, it } from 'vitest';
import { TestType } from '../types';
import type { ClassInfo } from './ClassHierarchy';
import { ClassHierarchy } from './ClassHierarchy';

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

describe('ClassHierarchy', () => {
    it('should register and retrieve class info', () => {
        const registry = new ClassHierarchy();
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

    it('should detect TestCase inheritance', () => {
        const registry = new ClassHierarchy();
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

        expect(registry.extendsTestCase('App\\ConcreteTest')).toBe(true);
        expect(registry.extendsTestCase('App\\AbstractTest')).toBe(true);
        expect(registry.extendsTestCase('App\\UnknownClass')).toBe(false);
    });

    it('should detect circular inheritance', () => {
        const registry = new ClassHierarchy();
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

        expect(registry.extendsTestCase('A')).toBe(false);
    });

    it('should not infinite loop on circular inheritance in resolveInheritedMethods', () => {
        const registry = new ClassHierarchy();
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

        const methods = registry.resolveInheritedMethods('A');
        expect(methods).toHaveLength(2);
        expect(methods.map((m) => m.methodName)).toContain('test_a');
        expect(methods.map((m) => m.methodName)).toContain('test_b');
    });

    it('should resolve inherited methods', () => {
        const registry = new ClassHierarchy();
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

        const methods = registry.resolveInheritedMethods('Child');
        expect(methods).toHaveLength(2);
        expect(methods.map((m) => m.methodName)).toContain('test_child');
        expect(methods.map((m) => m.methodName)).toContain('test_parent');
    });

    it('child override should take precedence in resolveInheritedMethods', () => {
        const registry = new ClassHierarchy();

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

        const methods = registry.resolveInheritedMethods('Child');
        expect(methods).toHaveLength(1);
        expect(methods[0].file).toBe('/child.php');
    });

    it('should find child classes', () => {
        const registry = new ClassHierarchy();
        registry.register(classInfo({ uri: '/parent.php', classFQN: 'Parent', isAbstract: true }));
        registry.register(
            classInfo({ uri: '/child1.php', classFQN: 'Child1', parentFQN: 'Parent' }),
        );
        registry.register(
            classInfo({ uri: '/child2.php', classFQN: 'Child2', parentFQN: 'Parent' }),
        );

        const children = registry.getChildClasses('Parent');
        expect(children).toHaveLength(2);
    });

    it('should get classes by URI', () => {
        const registry = new ClassHierarchy();
        registry.register(classInfo({ uri: '/test.php', classFQN: 'ClassA' }));
        registry.register(classInfo({ uri: '/test.php', classFQN: 'ClassB' }));
        registry.register(classInfo({ uri: '/other.php', classFQN: 'ClassC' }));

        const classes = registry.getClassesByUri('/test.php');
        expect(classes).toHaveLength(2);
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
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            expect(methods.map((x) => x.methodName)).toContain('test_from_trait');
            expect(methods.map((x) => x.methodName)).toContain('test_own');
        });

        it('should merge methods from multiple traits', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            expect(methods.map((x) => x.methodName)).toEqual(
                expect.arrayContaining(['test_t1', 'test_t2']),
            );
        });

        it('should handle insteadof conflict resolution', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            const shared = methods.find((x) => x.methodName === 'test_shared');
            expect(shared?.file).toBe('/t1.php');
        });

        it('should handle as (alias) adaptation', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            const names = methods.map((x) => x.methodName);
            expect(names).toContain('test_shared');
            expect(names).toContain('test_shared_alias');
        });

        it('should resolve nested trait use (trait uses trait)', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            const names = methods.map((x) => x.methodName);
            expect(names).toContain('test_inner');
            expect(names).toContain('test_outer');
        });

        it('should not infinite loop on circular trait use', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            const names = methods.map((x) => x.methodName);
            expect(names).toContain('test_a');
            expect(names).toContain('test_b');
        });

        it('own methods take precedence over trait methods', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            expect(methods).toHaveLength(1);
            expect(methods[0].file).toBe('/class.php');
        });

        it('trait methods take precedence over parent methods', () => {
            const registry = new ClassHierarchy();
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

            const methods = registry.resolveInheritedMethods('MyClass');
            const shared = methods.find((x) => x.methodName === 'test_shared');
            expect(shared?.file).toBe('/trait.php');
        });

        it('getTraitUsers returns classes that use a trait', () => {
            const registry = new ClassHierarchy();
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

            const users = registry.getTraitUsers('MyTrait');
            expect(users).toHaveLength(2);
            expect(users.map((u) => u.classFQN)).toEqual(expect.arrayContaining(['C1', 'C2']));
        });
    });
});
