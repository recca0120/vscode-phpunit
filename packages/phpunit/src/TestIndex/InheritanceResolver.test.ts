import { beforeAll, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { parsers } from '../../tests/support/parsers';
import { parseTestFiles } from '../../tests/support/parsing';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
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

describe.each(parsers)('InheritanceResolver on parsed test files (%s)', (_name, createParser) => {
    beforeAll(async () => initTreeSitter());

    const parseFiles = (files: { file: string; content: string }[], root: string) =>
        parseTestFiles(files, root, createParser());

    it('should discover inherited test methods in concrete class', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/AbstractTest.php'),
                    content: `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;
abstract class AbstractTest extends TestCase {
public function test_abstract() {}
}`,
                },
                {
                    file: phpUnitProject('tests/ConcreteFromAbstractTest.php'),
                    content: `<?php
namespace Tests;
class ConcreteFromAbstractTest extends AbstractTest {
}`,
                },
            ],
            root,
        );

        const concreteClass = tests.find(
            (t) => t.className === 'ConcreteFromAbstractTest' && !t.methodName,
        );
        expect(concreteClass).toBeDefined();

        const inheritedMethod = tests.find(
            (t) => t.className === 'ConcreteFromAbstractTest' && t.methodName === 'test_abstract',
        );
        expect(inheritedMethod).toBeDefined();
        expect(inheritedMethod).toEqual(
            expect.objectContaining({
                type: TestType.method,
                classFQN: 'Tests\\ConcreteFromAbstractTest',
                className: 'ConcreteFromAbstractTest',
                methodName: 'test_abstract',
                file: phpUnitProject('tests/ConcreteFromAbstractTest.php'),
            }),
        );
    });

    it('should merge own and inherited methods', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/AbstractTest.php'),
                    content: `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;
abstract class AbstractTest extends TestCase {
public function test_abstract() {}
}`,
                },
                {
                    file: phpUnitProject('tests/ConcreteWithOwnTest.php'),
                    content: `<?php
namespace Tests;
class ConcreteWithOwnTest extends AbstractTest {
public function test_own_method() {
    $this->assertTrue(true);
}
}`,
                },
            ],
            root,
        );

        const ownMethod = tests.find(
            (t) => t.className === 'ConcreteWithOwnTest' && t.methodName === 'test_own_method',
        );
        expect(ownMethod).toBeDefined();

        const inheritedMethod = tests.find(
            (t) => t.className === 'ConcreteWithOwnTest' && t.methodName === 'test_abstract',
        );
        expect(inheritedMethod).toBeDefined();
        expect(inheritedMethod?.classFQN).toBe('Tests\\ConcreteWithOwnTest');
    });

    it('should resolve use statement FQN correctly', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/UseTestCase.php'),
                    content: `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;
class UseTestCaseTest extends TestCase {
public function test_something() {}
}`,
                },
            ],
            root,
        );

        const method = tests.find((t) => t.methodName === 'test_something');
        expect(method).toBeDefined();
    });

    it('should handle fully qualified extends', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/FQNTest.php'),
                    content: `<?php
namespace Tests;
class FQNTest extends \\PHPUnit\\Framework\\TestCase {
public function test_fqn() {}
}`,
                },
            ],
            root,
        );

        const method = tests.find((t) => t.methodName === 'test_fqn');
        expect(method).toBeDefined();
    });

    it('should discover trait test methods', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/TraitMethodTest.php'),
                    content: `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;

trait TestHelperTrait {
public function test_from_trait() {
    $this->assertTrue(true);
}
}

class TraitMethodTest extends TestCase {
use TestHelperTrait;

public function test_own() {
    $this->assertTrue(true);
}
}`,
                },
            ],
            root,
        );

        const traitMethod = tests.find(
            (t) => t.className === 'TraitMethodTest' && t.methodName === 'test_from_trait',
        );
        expect(traitMethod).toBeDefined();
        expect(traitMethod?.classFQN).toBe('Tests\\TraitMethodTest');

        const ownMethod = tests.find(
            (t) => t.className === 'TraitMethodTest' && t.methodName === 'test_own',
        );
        expect(ownMethod).toBeDefined();
    });

    it('should handle trait insteadof and as adaptations', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/TraitConflictTest.php'),
                    content: `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;

trait TraitA {
public function test_shared() {}
public function test_a_only() {}
}

trait TraitB {
public function test_shared() {}
public function test_b_only() {}
}

class TraitConflictTest extends TestCase {
use TraitA, TraitB {
    TraitA::test_shared insteadof TraitB;
    TraitB::test_shared as test_shared_from_b;
}
}`,
                },
            ],
            root,
        );

        const methodNames = tests
            .filter((t) => t.className === 'TraitConflictTest' && t.methodName)
            .map((t) => t.methodName);

        expect(methodNames).toContain('test_shared');
        expect(methodNames).toContain('test_shared_from_b');
        expect(methodNames).toContain('test_a_only');
        expect(methodNames).toContain('test_b_only');
    });

    it('child class override should take precedence', () => {
        const root = phpUnitProject('');
        const tests = parseFiles(
            [
                {
                    file: phpUnitProject('tests/AbstractTest.php'),
                    content: `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;
abstract class AbstractTest extends TestCase {
public function test_override() {}
}`,
                },
                {
                    file: phpUnitProject('tests/OverrideTest.php'),
                    content: `<?php
namespace Tests;
class OverrideTest extends AbstractTest {
public function test_override() {
    $this->assertTrue(true);
}
}`,
                },
            ],
            root,
        );

        const overrideMethods = tests.filter(
            (t) => t.className === 'OverrideTest' && t.methodName === 'test_override',
        );
        expect(overrideMethods).toHaveLength(1);
        expect(overrideMethods[0].file).toBe(phpUnitProject('tests/OverrideTest.php'));
    });
});
