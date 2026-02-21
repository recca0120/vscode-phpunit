import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { findTest, parseTestFile, phpUnitProject } from '../../tests/utils';
import { PHPUnitXML } from '../PHPUnitXML';
import { type TestDefinition, TestType } from '../types';
import type { AstParser } from './AstParser';
import { ClassHierarchy } from './ClassHierarchy';
import { PhpParserAstParser } from './php-parser/PhpParserAstParser';
import { TestParser } from './TestParser';
import { TreeSitterAstParser } from './tree-sitter/TreeSitterAstParser';
import { initTreeSitter } from './tree-sitter/TreeSitterParser';

const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];

export const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, phpUnitProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('PHPUnitParser Test (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) => {
        return findTest(parse(content, file, createParser()), id);
    };

    describe('AssertionsTest', () => {
        const file = phpUnitProject('tests/AssertionsTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('parse namespace', () => {
            expect(givenTest(file, content, 'Tests')).toEqual(
                expect.objectContaining({
                    type: TestType.namespace,
                    // file,
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
            expect(parse(content, file)).toHaveLength(0);
        });
    });

    describe('parse StaticMethodTest', () => {
        const file = phpUnitProject('tests/StaticMethodTest.php');
        let content: string;
        beforeAll(async () => (content = (await readFile(file)).toString()));

        it('StaticMethodTest should has 3 tests', () => {
            expect(parse(content, file)).toHaveLength(3);
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
            expect(parse(content, file)).toHaveLength(3);
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
                    start: { line: 33, character: 4 },
                    end: { line: 36, character: 5 },
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

    it('fix const array problem', () => {
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

    it('ignore annotation string case', () => {
        const file = phpUnitProject('tests/TestDoxTest.php');
        const content = `<?php declare(strict_types=1);
        
use PHPUnit\\Framework\\TestCase;

final class TestDoxTest extends TestCase {
    /**
     * @testDox Do a test
     * @testWIth [1,1]
     *           [2,2]
     *           [3,3]
     */
    public function testAtTestWith($a,$b){
        $this->assertEquals($a,$b);
    }
}
`;
        expect(givenTest(file, content, 'testAtTestWith')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Test Dox::At test with',
                classFQN: 'TestDoxTest',
                className: 'TestDoxTest',
                methodName: 'testAtTestWith',
                label: 'Do a test',
                annotations: { testdox: ['Do a test'] },
                start: { line: expect.any(Number), character: expect.any(Number) },
                end: { line: expect.any(Number), character: expect.any(Number) },
            }),
        );
    });

    it('parse @group annotation', () => {
        const file = phpUnitProject('tests/GroupTest.php');
        const content = `<?php declare(strict_types=1);

use PHPUnit\\Framework\\TestCase;

final class GroupTest extends TestCase {
    /**
     * @group integration
     * @group slow
     */
    public function test_with_groups() {
        $this->assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_with_groups')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Group::With groups',
                classFQN: 'GroupTest',
                className: 'GroupTest',
                methodName: 'test_with_groups',
                annotations: { group: ['integration', 'slow'] },
            }),
        );
    });

    it('parse #[Group] attribute', () => {
        const file = phpUnitProject('tests/GroupAttributeTest.php');
        const content = `<?php declare(strict_types=1);

use PHPUnit\\Framework\\TestCase;
use PHPUnit\\Framework\\Attributes\\Group;

final class GroupAttributeTest extends TestCase {
    #[Group('plaid')]
    #[Group('api')]
    public function test_with_group_attributes() {
        $this->assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_with_group_attributes')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Group Attribute::With group attributes',
                classFQN: 'GroupAttributeTest',
                className: 'GroupAttributeTest',
                methodName: 'test_with_group_attributes',
                annotations: { group: ['plaid', 'api'] },
            }),
        );
    });

    it('parse single @group annotation', () => {
        const file = phpUnitProject('tests/SingleGroupTest.php');
        const content = `<?php declare(strict_types=1);

use PHPUnit\\Framework\\TestCase;

final class SingleGroupTest extends TestCase {
    /**
     * @group unit
     */
    public function test_unit() {
        $this->assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_unit')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                file,
                methodName: 'test_unit',
                annotations: { group: ['unit'] },
            }),
        );
    });

    it('detect test class not ending with Test but extending TestCase (#342)', () => {
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

    it('parse PHP 8.4 new without parentheses syntax (#356)', () => {
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

    describe('Inherited test methods with ClassHierarchy', () => {
        const parseWithRegistry = (files: { file: string; content: string }[], root: string) => {
            const phpUnitXML = new PHPUnitXML();
            phpUnitXML.setRoot(root);
            const testParser = new TestParser(phpUnitXML, createParser());
            const classHierarchy = new ClassHierarchy();

            const allResults: TestDefinition[] = [];
            for (const { file, content } of files) {
                const result = testParser.parse(content, file);
                if (result) {
                    for (const cls of result.classes) {
                        classHierarchy.register(cls);
                    }
                    allResults.push(...result.tests);
                }
            }

            const enriched = classHierarchy.enrichTests(allResults);
            const allTests: TestDefinition[] = [];
            const collect = (defs: TestDefinition[]) => {
                for (const def of defs) {
                    allTests.push(def);
                    if (def.children && def.children.length > 0) {
                        collect(def.children);
                    }
                }
            };
            collect(enriched);

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

        it('should merge own and inherited methods', () => {
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
            const tests = parseWithRegistry(
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
            const tests = parseWithRegistry(
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
            const tests = parseWithRegistry(
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

        it('child class override should take precedence', () => {
            const root = phpUnitProject('');
            const tests = parseWithRegistry(
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
            // Should only appear once (own method, not duplicated from parent)
            expect(overrideMethods).toHaveLength(1);
            expect(overrideMethods[0].file).toBe(phpUnitProject('tests/OverrideTest.php'));
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

    it('php-parser fails to parse property hooks', () => {
        expect(parse(content, file, new PhpParserAstParser())).toEqual([]);
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
