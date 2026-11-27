import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../test-support/fixtures';
import { parsers } from '../../test-support/parsers';
import { findTest, parseTestFile } from '../../test-support/parsing';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { PhpParserAstParser } from '../Interpreter/AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from '../Interpreter/AstParser/TreeSitter/TreeSitterAstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { TestType } from '../types';

const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, phpUnitProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('TestParser on PHPUnit test structure (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) =>
        findTest(parse(content, file, createParser()), id);

    describe('AssertionsTest', () => {
        const file = phpUnitProject('tests/AssertionsTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parses the namespace', () => {
            expect(givenTest(file, content, 'Tests')).toEqual(
                expect.objectContaining({
                    type: TestType.namespace,
                    id: 'namespace:Tests',
                    classFQN: 'Tests',
                    namespace: 'Tests',
                }),
            );
        });

        it('namespace range covers only the namespace statement', () => {
            expect(givenTest(file, content, 'Tests')).toEqual(
                expect.objectContaining({
                    start: { line: 3, character: 0 },
                    end: { line: 3, character: 16 },
                }),
            );
        });

        it('parses the class', () => {
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

        it('parses test_passed', () => {
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

        it('parses test_failed', () => {
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

        it('parses test_is_not_same', () => {
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

        it('parses test_risky', () => {
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

        it('parses annotation_test', () => {
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

        it('parses test_skipped', () => {
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

        it('parses test_incomplete', () => {
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

        it('parses addition_provider', () => {
            expect(givenTest(file, content, 'addition_provider')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    file,
                    id: 'Assertions (Tests\\Assertions)::Addition provider',
                    label: 'addition_provider',
                    classFQN: 'Tests\\AssertionsTest',
                    namespace: 'Tests',
                    className: 'AssertionsTest',
                    methodName: 'addition_provider',
                    annotations: {
                        dataProvider: ['additionProvider'],
                        depends: ['test_passed'],
                        dataset: ['data set #0', 'data set #1', 'data set #2'],
                    },
                    start: { line: 66, character: 4 },
                    end: { line: 69, character: 5 },
                }),
            );
        });

        it('parses testdox annotation', () => {
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

    describe('AbstractTest', () => {
        const file = phpUnitProject('tests/AbstractTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('skips an abstract class', () => {
            expect(parse(content, file)).toHaveLength(0);
        });
    });

    describe('StaticMethodTest', () => {
        const file = phpUnitProject('tests/StaticMethodTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('finds the 3 tests of StaticMethodTest', () => {
            expect(parse(content, file)).toHaveLength(3);
        });

        it('parses test_static_public_fail', () => {
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

    describe('HasPropertyTest', () => {
        const file = phpUnitProject('tests/SubFolder/HasPropertyTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('finds the 3 tests of HasPropertyTest', () => {
            expect(parse(content, file)).toHaveLength(3);
        });

        it('parses a test next to properties', () => {
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

    describe('LeadingCommentsTest', () => {
        const file = phpUnitProject('tests/SubFolder/LeadingCommentsTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parses firstLeadingComments', () => {
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

    describe('UseTraitTest', () => {
        const file = phpUnitProject('tests/SubFolder/UseTraitTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parses use_trait', () => {
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

    describe('NoNamespaceTest', () => {
        const file = phpUnitProject('tests/NoNamespaceTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parses a class without a namespace', () => {
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

    it('parses a class in a file that uses require_once', () => {
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

    it('parses a class with typed array constants', () => {
        const file = phpUnitProject('tests/ArrayConstTest.php');
        const content = `<?php declare(strict_types=1);
        
use PHPUnit\\Framework\\TestCase;

final class ArrayConstTest extends TestCase {
    public const bool IS_EMAIL = true;

    public const array HTTP_EMAIL_TEMPLATE_RESPONSES = [
        'a' => 'b',
        'c' => 'd',
    ];
    
    public function test_hello() {
        self::assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_hello')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Array Const::Hello',
                classFQN: 'ArrayConstTest',
                className: 'ArrayConstTest',
                methodName: 'test_hello',
                start: { line: expect.any(Number), character: 4 },
                end: { line: expect.any(Number), character: 5 },
            }),
        );
    });

    it('detects a test class not ending with Test that extends TestCase (#342)', () => {
        const file = phpUnitProject('tests/Example.php');
        const content = `<?php
use PHPUnit\\Framework\\TestCase;
use PHPUnit\\Framework\\Attributes\\Test;

class Example extends TestCase
{
    #[Test]
    public function Test()
    {
        self::assertIsInt(1);
    }
}
`;
        const tests = parse(content, file);
        const method = tests.find((t) => t.methodName === 'Test');
        expect(method).toBeDefined();
        expect(method).toEqual(
            expect.objectContaining({
                type: TestType.method,
                className: 'Example',
                methodName: 'Test',
            }),
        );
    });

    it('parses PHP 8.4 new without parentheses (#356)', () => {
        const file = phpUnitProject('tests/Php84SyntaxTest.php');
        const content = `<?php
namespace Tests;
use PHPUnit\\Framework\\TestCase;

class Php84SyntaxTest extends TestCase
{
    public function test_new_without_parentheses()
    {
        $result = new \\ArrayObject()->count();
        $this->assertIsInt($result);
    }
}
`;
        const tests = parse(content, file);
        const method = tests.find((t) => t.methodName === 'test_new_without_parentheses');
        expect(method).toBeDefined();
        expect(method).toEqual(
            expect.objectContaining({
                type: TestType.method,
                className: 'Php84SyntaxTest',
                methodName: 'test_new_without_parentheses',
            }),
        );
    });

    it('parses a class with property hooks (#336)', () => {
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
        const tests = parse(content, file, createParser());
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

    describe('file with several braced namespaces', () => {
        const file = phpUnitProject('tests/MultipleNamespacesTest.php');
        const content = `<?php
namespace First {
    use PHPUnit\\Framework\\TestCase;
    class FooTest extends TestCase { public function test_first() {} }
}
namespace Second {
    use PHPUnit\\Framework\\TestCase as Base;
    class BarTest extends Base { public function test_second() {} }
}
`;

        it('parses the test from the second namespace', () => {
            expect(givenTest(file, content, 'test_second')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    id: 'Bar (Second\\Bar)::Second',
                    classFQN: 'Second\\BarTest',
                    namespace: 'Second',
                    className: 'BarTest',
                    methodName: 'test_second',
                }),
            );
        });

        it('second namespace range covers its own block', () => {
            expect(givenTest(file, content, 'Second')).toEqual(
                expect.objectContaining({
                    type: TestType.namespace,
                    id: 'namespace:Second',
                    start: { line: 6, character: 0 },
                    end: { line: 9, character: 1 },
                }),
            );
        });
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

    const givenTest = (id: string) => findTest(parse(content, file, new TreeSitterAstParser()), id);
    const givenPhpParserTest = (id: string) =>
        findTest(parse(content, file, new PhpParserAstParser()), id);

    it('php-parser (3.7+) parses class with property hooks', () => {
        expect(givenPhpParserTest('PropertyHooksTest')).toEqual(
            expect.objectContaining({
                type: TestType.class,
                file,
                classFQN: 'Tests\\PropertyHooksTest',
                className: 'PropertyHooksTest',
            }),
        );
    });

    it('tree-sitter parses class with property hooks', () => {
        expect(givenTest('PropertyHooksTest')).toEqual(
            expect.objectContaining({
                type: TestType.class,
                file,
                classFQN: 'Tests\\PropertyHooksTest',
                className: 'PropertyHooksTest',
            }),
        );
    });

    it('tree-sitter parses test_anonymous_class_with_property_hooks', () => {
        expect(givenTest('test_anonymous_class_with_property_hooks')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                classFQN: 'Tests\\PropertyHooksTest',
                className: 'PropertyHooksTest',
                methodName: 'test_anonymous_class_with_property_hooks',
            }),
        );
    });

    it('tree-sitter parses test_another_assertion', () => {
        expect(givenTest('test_another_assertion')).toEqual(
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
