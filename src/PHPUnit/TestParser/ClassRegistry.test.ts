import { describe, expect, it } from 'vitest';
import { TestType } from '../types';
import { ClassRegistry } from './ClassRegistry';

describe('ClassRegistry', () => {
    it('should register and retrieve class info', () => {
        const registry = new ClassRegistry();
        registry.register({
            uri: '/test.php',
            classFQN: 'App\\MyClass',
            parentFQN: 'App\\BaseClass',
            isAbstract: false,
            methods: [],
        });

        const info = registry.get('App\\MyClass');
        expect(info).toBeDefined();
        expect(info?.parentFQN).toBe('App\\BaseClass');
    });

    it('should detect TestCase inheritance', () => {
        const registry = new ClassRegistry();
        registry.register({
            uri: '/abstract.php',
            classFQN: 'App\\AbstractTest',
            parentFQN: 'PHPUnit\\Framework\\TestCase',
            isAbstract: true,
            methods: [],
        });
        registry.register({
            uri: '/concrete.php',
            classFQN: 'App\\ConcreteTest',
            parentFQN: 'App\\AbstractTest',
            isAbstract: false,
            methods: [],
        });

        expect(registry.extendsTestCase('App\\ConcreteTest')).toBe(true);
        expect(registry.extendsTestCase('App\\AbstractTest')).toBe(true);
        expect(registry.extendsTestCase('App\\UnknownClass')).toBe(false);
    });

    it('should detect circular inheritance', () => {
        const registry = new ClassRegistry();
        registry.register({
            uri: '/a.php',
            classFQN: 'A',
            parentFQN: 'B',
            isAbstract: false,
            methods: [],
        });
        registry.register({
            uri: '/b.php',
            classFQN: 'B',
            parentFQN: 'A',
            isAbstract: false,
            methods: [],
        });

        expect(registry.extendsTestCase('A')).toBe(false);
    });

    it('should resolve inherited methods', () => {
        const registry = new ClassRegistry();
        const parentMethod = {
            type: TestType.method,
            id: 'test',
            label: 'test',
            methodName: 'test_parent',
            depth: 2,
        };
        const childMethod = {
            type: TestType.method,
            id: 'test',
            label: 'test',
            methodName: 'test_child',
            depth: 2,
        };

        registry.register({
            uri: '/parent.php',
            classFQN: 'Parent',
            parentFQN: 'PHPUnit\\Framework\\TestCase',
            isAbstract: true,
            methods: [parentMethod],
        });
        registry.register({
            uri: '/child.php',
            classFQN: 'Child',
            parentFQN: 'Parent',
            isAbstract: false,
            methods: [childMethod],
        });

        const methods = registry.resolveInheritedMethods('Child');
        expect(methods).toHaveLength(2);
        expect(methods.map((m) => m.methodName)).toContain('test_child');
        expect(methods.map((m) => m.methodName)).toContain('test_parent');
    });

    it('child override should take precedence in resolveInheritedMethods', () => {
        const registry = new ClassRegistry();

        registry.register({
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
                    depth: 2,
                },
            ],
        });
        registry.register({
            uri: '/child.php',
            classFQN: 'Child',
            parentFQN: 'Parent',
            isAbstract: false,
            methods: [
                {
                    type: TestType.method,
                    id: 'c',
                    label: 'c',
                    methodName: 'test_shared',
                    file: '/child.php',
                    depth: 2,
                },
            ],
        });

        const methods = registry.resolveInheritedMethods('Child');
        expect(methods).toHaveLength(1);
        expect(methods[0].file).toBe('/child.php');
    });

    it('should find child classes', () => {
        const registry = new ClassRegistry();
        registry.register({
            uri: '/parent.php',
            classFQN: 'Parent',
            isAbstract: true,
            methods: [],
        });
        registry.register({
            uri: '/child1.php',
            classFQN: 'Child1',
            parentFQN: 'Parent',
            isAbstract: false,
            methods: [],
        });
        registry.register({
            uri: '/child2.php',
            classFQN: 'Child2',
            parentFQN: 'Parent',
            isAbstract: false,
            methods: [],
        });

        const children = registry.getChildClasses('Parent');
        expect(children).toHaveLength(2);
    });

    it('should delete by URI', () => {
        const registry = new ClassRegistry();
        registry.register({
            uri: '/test.php',
            classFQN: 'MyClass',
            isAbstract: false,
            methods: [],
        });

        registry.deleteByUri('/test.php');
        expect(registry.get('MyClass')).toBeUndefined();
    });

    it('should get classes by URI', () => {
        const registry = new ClassRegistry();
        registry.register({
            uri: '/test.php',
            classFQN: 'ClassA',
            isAbstract: false,
            methods: [],
        });
        registry.register({
            uri: '/test.php',
            classFQN: 'ClassB',
            isAbstract: false,
            methods: [],
        });
        registry.register({
            uri: '/other.php',
            classFQN: 'ClassC',
            isAbstract: false,
            methods: [],
        });

        const classes = registry.getClassesByUri('/test.php');
        expect(classes).toHaveLength(2);
    });
});
