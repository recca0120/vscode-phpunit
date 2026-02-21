import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { findTest, pestProject, phpUnitProject } from '../../../tests/utils';
import { PHPUnitXML } from '../../PHPUnitXML';
import { type TestDefinition, TestType } from '../../types';
import { ClassHierarchy } from '../ClassHierarchy';
import { PestTestExtractor } from '../PestTestExtractor';
import { PHPUnitTestExtractor } from '../PHPUnitTestExtractor';
import { TestNode } from '../TestNode';
import { adapt } from './TreeSitterAdapter';
import { initTreeSitter, parsePhp } from './TreeSitterParser';

function flattenTests(tests: TestDefinition[]): TestDefinition[] {
    const result: TestDefinition[] = [];
    for (const test of tests) {
        result.push(test);
        if (test.children && test.children.length > 0) {
            result.push(...flattenTests(test.children));
        }
    }
    return result;
}

function parseWithTreeSitter(
    buffer: Buffer | string,
    file: string,
    root: string,
): TestDefinition[] {
    const code = buffer.toString();
    const tree = parsePhp(code);
    const ast = adapt(tree.rootNode);
    tree.delete();

    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(root);

    const definition = new TestNode(ast, { phpUnitXML, file });
    const extractors = [new PestTestExtractor(), new PHPUnitTestExtractor()];
    for (const extractor of extractors) {
        const result = extractor.extract(definition);
        if (result) {
            return flattenTests(result.tests);
        }
    }

    return [];
}

const parsePhpUnit = (buffer: Buffer | string, file: string) =>
    parseWithTreeSitter(buffer, file, phpUnitProject(''));

const parsePest = (buffer: Buffer | string, file: string) =>
    parseWithTreeSitter(buffer, file, pestProject(''));

beforeAll(async () => initTreeSitter());

describe('TreeSitterAdapter — PHPUnit', () => {
    const givenTest = (file: string, content: string, id: string) => {
        return findTest(parsePhpUnit(content, file), id);
    };

    describe('AssertionsTest', () => {
        const file = phpUnitProject('tests/AssertionsTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parse namespace', () => {
            expect(givenTest(file, content, 'Tests')).toEqual(
                expect.objectContaining({
                    type: TestType.namespace,
                    id: 'namespace:Tests',
                    classFQN: 'Tests',
                    namespace: 'Tests',
                }),
            );
        });

        it('parse class', () => {
            expect(givenTest(file, content, 'AssertionsTest')).toEqual(
                expect.objectContaining({
                    type: TestType.class,
                    file,
                    id: 'Assertions (Tests\\Assertions)',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    start: { line: 9, character: 0 },
                    end: { line: 85, character: 1 },
                }),
            );
        });

        it('it should parse test_passed', () => {
            expect(givenTest(file, content, 'test_passed')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Passed',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'test_passed',
                    annotations: { group: ['integration'] },
                    start: { line: 16, character: 4 },
                    end: { line: 19, character: 5 },
                }),
            );
        });

        it('it should parse test_failed', () => {
            expect(givenTest(file, content, 'test_failed')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Failed',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'test_failed',
                    annotations: { depends: ['test_passed'], group: ['integration'] },
                    start: { line: 25, character: 4 },
                    end: { line: 28, character: 5 },
                }),
            );
        });

        it('it should parse test_is_not_same', () => {
            expect(givenTest(file, content, 'test_is_not_same')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Is not same',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'test_is_not_same',
                    start: { line: 30, character: 4 },
                    end: { line: 33, character: 5 },
                }),
            );
        });

        it('it should parse test_risky', () => {
            expect(givenTest(file, content, 'test_risky')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Risky',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'test_risky',
                    start: { line: 35, character: 4 },
                    end: { line: 38, character: 5 },
                }),
            );
        });

        it('it should parse annotation_test', () => {
            expect(givenTest(file, content, 'annotation_test')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Annotation test',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'annotation_test',
                    annotations: { group: ['integration'] },
                    start: { line: 44, character: 4 },
                    end: { line: 47, character: 5 },
                }),
            );
        });

        it('it should parse test_skipped', () => {
            expect(givenTest(file, content, 'test_skipped')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Skipped',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'test_skipped',
                    start: { line: 49, character: 4 },
                    end: { line: 52, character: 5 },
                }),
            );
        });

        it('it should parse test_incomplete', () => {
            expect(givenTest(file, content, 'test_incomplete')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Incomplete',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'test_incomplete',
                    start: { line: 54, character: 4 },
                    end: { line: 57, character: 5 },
                }),
            );
        });

        it('it should parse addition_provider', () => {
            expect(givenTest(file, content, 'addition_provider')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Addition provider',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'addition_provider',
                    annotations: {
                        dataProvider: ['additionProvider'],
                        depends: ['test_passed'],
                    },
                    start: { line: 66, character: 4 },
                    end: { line: 69, character: 5 },
                }),
            );
        });

        it('it should parse testdox annotation', () => {
            expect(givenTest(file, content, 'balanceIsInitiallyZero')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Balance is initially zero',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'balanceIsInitiallyZero',
                    annotations: { testdox: ['has an initial balance of zero'] },
                    start: { line: 81, character: 4 },
                    end: { line: 84, character: 5 },
                }),
            );
        });
    });

    describe('parse AbstractTest', () => {
        const file = phpUnitProject('tests/AbstractTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('it should not parse abstract class', () => {
            expect(parsePhpUnit(content, file)).toHaveLength(0);
        });
    });

    describe('parse StaticMethodTest', () => {
        const file = phpUnitProject('tests/StaticMethodTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('StaticMethodTest should has 3 tests', () => {
            expect(parsePhpUnit(content, file)).toHaveLength(3);
        });

        it('it should parse test_static_public_fail', () => {
            expect(givenTest(file, content, 'test_static_public_fail')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Static Method (Tests\\StaticMethod)::Static public fail',
                    classFQN: 'Tests\\StaticMethodTest',
                    namespace: 'Tests',
                    className: 'StaticMethodTest',
                    methodName: 'test_static_public_fail',
                    start: { line: 9, character: 4 },
                    end: { line: 11, character: 5 },
                }),
            );
        });
    });

    describe('parse HasPropertyTest', () => {
        const file = phpUnitProject('tests/SubFolder/HasPropertyTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('HasPropertyTest should has 3 tests', () => {
            expect(parsePhpUnit(content, file)).toHaveLength(3);
        });

        it('it should parse property', () => {
            expect(givenTest(file, content, 'property')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Has Property (Tests\\SubFolder\\HasProperty)::Property',
                    classFQN: 'Tests\\SubFolder\\HasPropertyTest',
                    namespace: 'Tests\\SubFolder',
                    className: 'HasPropertyTest',
                    methodName: 'property',
                    start: { line: 17, character: 4 },
                    end: { line: 20, character: 5 },
                }),
            );
        });
    });

    describe('parse LeadingCommentsTest', () => {
        const file = phpUnitProject('tests/SubFolder/LeadingCommentsTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('it should parse firstLeadingComments', () => {
            expect(givenTest(file, content, 'firstLeadingComments')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Leading Comments (Tests\\SubFolder\\LeadingComments)::First leading comments',
                    classFQN: 'Tests\\SubFolder\\LeadingCommentsTest',
                    namespace: 'Tests\\SubFolder',
                    className: 'LeadingCommentsTest',
                    methodName: 'firstLeadingComments',
                    start: { line: 10, character: 4 },
                    end: { line: 13, character: 5 },
                }),
            );
        });
    });

    describe('parse UseTraitTest', () => {
        const file = phpUnitProject('tests/SubFolder/UseTraitTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('it should parse use_trait', () => {
            expect(givenTest(file, content, 'use_trait')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Use Trait (Tests\\SubFolder\\UseTrait)::Use trait',
                    classFQN: 'Tests\\SubFolder\\UseTraitTest',
                    namespace: 'Tests\\SubFolder',
                    className: 'UseTraitTest',
                    methodName: 'use_trait',
                    start: { line: 41, character: 4 },
                    end: { line: 44, character: 5 },
                }),
            );
        });
    });

    describe('parse AttributeTest', () => {
        const file = phpUnitProject('tests/AttributeTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parse class with Group attribute', () => {
            expect(givenTest(file, content, 'AttributeTest')).toEqual(
                expect.objectContaining({
                    type: TestType.class,
                    file,
                    id: 'Attribute (Tests\\Attribute)',
                    classFQN: 'Tests\\AttributeTest',
                    namespace: 'Tests',
                    className: 'AttributeTest',
                    annotations: { group: ['integration'] },
                    start: { line: 13, character: 0 },
                    end: { line: 61, character: 1 },
                }),
            );
        });

        it('parse Test Attribute', () => {
            expect(givenTest(file, content, 'hi')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Attribute (Tests\\Attribute)::Hi',
                    classFQN: 'Tests\\AttributeTest',
                    namespace: 'Tests',
                    className: 'AttributeTest',
                    methodName: 'hi',
                    start: { line: 16, character: 4 },
                    end: { line: 19, character: 5 },
                }),
            );
        });

        it('parse DataProvider Attribute', () => {
            expect(givenTest(file, content, 'testAdd')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Attribute (Tests\\Attribute)::Add',
                    classFQN: 'Tests\\AttributeTest',
                    namespace: 'Tests',
                    className: 'AttributeTest',
                    methodName: 'testAdd',
                    annotations: {
                        dataProvider: ['additionProvider'],
                        dataset: ['#0', '#1', '#2', '#3'],
                    },
                    start: { line: 22, character: 4 },
                    end: { line: 25, character: 5 },
                }),
            );
        });

        it('parse Depends Attribute', () => {
            expect(givenTest(file, content, 'testPush')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Attribute (Tests\\Attribute)::Push',
                    classFQN: 'Tests\\AttributeTest',
                    namespace: 'Tests',
                    className: 'AttributeTest',
                    methodName: 'testPush',
                    annotations: { depends: ['testEmpty'] },
                    start: { line: 46, character: 4 },
                    end: { line: 53, character: 5 },
                }),
            );
        });

        it('parse TestDox Attribute', () => {
            expect(givenTest(file, content, 'balanceIsInitiallyZero')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Attribute (Tests\\Attribute)::Balance is initially zero',
                    classFQN: 'Tests\\AttributeTest',
                    namespace: 'Tests',
                    className: 'AttributeTest',
                    methodName: 'balanceIsInitiallyZero',
                    annotations: { testdox: ['has an initial balance of zero'] },
                    start: { line: 57, character: 4 },
                    end: { line: 60, character: 5 },
                }),
            );
        });
    });

    describe('parse NoNamespaceTest', () => {
        const file = phpUnitProject('tests/NoNamespaceTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parse NoNamespaceTest', () => {
            expect(givenTest(file, content, 'test_no_namespace')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'No Namespace::No namespace',
                    classFQN: 'NoNamespaceTest',
                    className: 'NoNamespaceTest',
                    methodName: 'test_no_namespace',
                    label: 'test_no_namespace',
                    start: { line: 7, character: 4 },
                    end: { line: 10, character: 5 },
                }),
            );
        });
    });

    it('has require', () => {
        const file = phpUnitProject('tests/PDF_testerTest.php');
        const content = `<?php declare(strict_types=1);
require_once "vendor/autoload.php";
use PHPUnit\\Framework\\TestCase;
final class PDF_testerTest extends TestCase {
    public function test_hello() {
        self::assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_hello')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                id: 'PDF Tester::Hello',
                classFQN: 'PDF_testerTest',
                className: 'PDF_testerTest',
                methodName: 'test_hello',
                start: { line: 5, character: 4 },
                end: { line: 7, character: 5 },
            }),
        );
    });

    it('parse PHP 8.4 property hooks (#336)', () => {
        const file = phpUnitProject('tests/PropertyHooksTest.php');
        const content = `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;

class PropertyHooksTest extends TestCase
{
    public string $name {
        get => 'test';
        set => $value;
    }

    public function test_something()
    {
        $this->assertTrue(true);
    }
}
`;
        const tests = parsePhpUnit(content, file);
        const method = tests.find((t) => t.methodName === 'test_something');
        expect(method).toBeDefined();
        expect(method).toEqual(
            expect.objectContaining({
                type: TestType.method,
                className: 'PropertyHooksTest',
                methodName: 'test_something',
            }),
        );
    });

    describe('Inherited test methods with ClassHierarchy', () => {
        const parseWithRegistry = (files: { file: string; content: string }[], root: string) => {
            const hierarchy = new ClassHierarchy();
            let allTests: TestDefinition[] = [];
            const phpUnitXML = new PHPUnitXML();
            phpUnitXML.setRoot(root);

            for (const { file, content } of files) {
                const tree = parsePhp(content);
                const ast = adapt(tree.rootNode);
                tree.delete();

                const definition = new TestNode(ast, { phpUnitXML, file });
                const extractor = new PHPUnitTestExtractor();
                const result = extractor.extract(definition);
                if (result) {
                    for (const cls of result.classes) {
                        hierarchy.register(cls);
                    }
                    allTests.push(...flattenTests(result.tests));
                }
            }

            allTests = flattenTests(hierarchy.enrichTests(allTests));

            return allTests;
        };

        it('should discover inherited test methods in concrete class', () => {
            const root = phpUnitProject('');
            const tests = parseWithRegistry(
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
                (t) =>
                    t.className === 'ConcreteFromAbstractTest' && t.methodName === 'test_abstract',
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

        it('should handle trait insteadof and as adaptations', () => {
            const root = phpUnitProject('');
            const tests = parseWithRegistry(
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
    });

    describe('PropertyHooksTest (PHP 8.4 — issue #336)', () => {
        const file = phpUnitProject('tests/PropertyHooksTest.php');
        const content = `<?php

namespace Tests;

use PHPUnit\\Framework\\TestCase;

class PropertyHooksTest extends TestCase
{
    public function test_anonymous_class_with_property_hooks()
    {
        $obj = new class {
            private string $raw = '';

            public string $name {
                get => strtoupper($this->raw);
                set (string $value) {
                    $this->raw = trim($value);
                }
            }
        };

        $obj->name = '  hello  ';
        $this->assertSame('HELLO', $obj->name);
    }

    public function test_another_assertion()
    {
        $this->assertTrue(true);
    }
}
`;

        it('parse class with property hooks in anonymous class', () => {
            expect(givenTest(file, content, 'PropertyHooksTest')).toEqual(
                expect.objectContaining({
                    type: TestType.class,
                    file,
                    classFQN: 'Tests\\PropertyHooksTest',
                    className: 'PropertyHooksTest',
                }),
            );
        });

        it('should parse test_anonymous_class_with_property_hooks', () => {
            expect(givenTest(file, content, 'test_anonymous_class_with_property_hooks')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    classFQN: 'Tests\\PropertyHooksTest',
                    className: 'PropertyHooksTest',
                    methodName: 'test_anonymous_class_with_property_hooks',
                }),
            );
        });

        it('should parse test_another_assertion', () => {
            expect(givenTest(file, content, 'test_another_assertion')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    classFQN: 'Tests\\PropertyHooksTest',
                    className: 'PropertyHooksTest',
                    methodName: 'test_another_assertion',
                }),
            );
        });
    });
});

describe('TreeSitterAdapter — Pest', () => {
    const file = pestProject('tests/Fixtures/ExampleTest.php');

    const givenTest = (content: string, id: string) => {
        return findTest(parsePest(content, file), id);
    };

    it('example', () => {
        const content = `<?php

test('example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(content, 'example')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::example',
                classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
                namespace: 'P\\Tests\\Fixtures',
                className: 'ExampleTest',
                methodName: 'example',
                label: 'example',
                file,
                start: { line: expect.any(Number), character: expect.any(Number) },
                end: { line: expect.any(Number), character: expect.any(Number) },
            }),
        );
    });

    it('it test example', () => {
        const content = `<?php

it('test example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(content, 'it test example')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::it test example',
                classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
                namespace: 'P\\Tests\\Fixtures',
                className: 'ExampleTest',
                methodName: 'it test example',
                label: 'it test example',
                file,
            }),
        );
    });

    it('describe → example', () => {
        const content = `<?php

describe('something', function () {
    test('example', function () {
        expect(true)->toBeTrue();
    });
});
        `;

        expect(givenTest(content, '`something`')).toEqual(
            expect.objectContaining({
                type: TestType.describe,
                id: 'tests/Fixtures/ExampleTest.php::`something`',
                methodName: '`something`',
                label: 'something',
            }),
        );

        expect(givenTest(content, '`something` → example')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`something` → example',
                methodName: '`something` → example',
                label: 'example',
            }),
        );
    });

    it('arch', () => {
        const content = `<?php

arch()->preset()->php();
arch()->preset()->strict();
arch()->preset()->security();

        `;

        expect(givenTest(content, 'preset  → php ')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::preset  → php ',
                methodName: 'preset  → php ',
                label: 'preset → php',
            }),
        );
    });

    it('test with namedargument', () => {
        const content = `<?php

describe(description: 'something', test: function () {
    it(description: 'asserts true is true', test: function () {
        expect(true)->toBe(true);
    });
});
        `;

        expect(givenTest(content, '`something` → it asserts true is true')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`something` → it asserts true is true',
                methodName: '`something` → it asserts true is true',
                label: 'it asserts true is true',
            }),
        );
    });

    it('not it or test', () => {
        const content = `<?php

function hello(string $description,  callable $closure) {}

hello('hello', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(content, 'hello')).toBeUndefined();
    });

    it('arrow function describe', () => {
        const content = `<?php

describe('something', fn () => it('example', fn() => expect(true)->toBeTrue()));

        `;

        expect(givenTest(content, '`something` → it example')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`something` → it example',
                methodName: '`something` → it example',
                label: 'it example',
            }),
        );
    });
});
