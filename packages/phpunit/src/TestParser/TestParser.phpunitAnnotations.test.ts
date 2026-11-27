import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { parsers } from '../../tests/support/parsers';
import { findTest, parseTestFile } from '../../tests/support/parsing';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { TestType } from '../types';

const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, phpUnitProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)(
    'TestParser on PHPUnit annotations and attributes (%s)',
    (_name, createParser) => {
        const givenTest = (file: string, content: string, id: string) =>
            findTest(parse(content, file, createParser()), id);

        describe('AttributeTest', () => {
            const file = phpUnitProject('tests/AttributeTest.php');
            let content: string;
            beforeAll(async () => (content = (await readFile(file)).toString()));

            it('parses a class with a Group attribute', () => {
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

            it('parses the Test attribute', () => {
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

            it('parses the DataProvider attribute', () => {
                expect(givenTest(file, content, 'testAdd')).toEqual(
                    expect.objectContaining({
                        type: TestType.method,
                        file,
                        id: 'Attribute (Tests\\Attribute)::Add',
                        label: 'testAdd',
                        classFQN: 'Tests\\AttributeTest',
                        namespace: 'Tests',
                        className: 'AttributeTest',
                        methodName: 'testAdd',
                        annotations: {
                            dataProvider: ['additionProvider'],
                            dataset: ['data set #0', 'data set #1', 'data set #2', 'data set #3'],
                        },
                        start: { line: 22, character: 4 },
                        end: { line: 25, character: 5 },
                    }),
                );
            });

            it('parses the DataProvider attribute with mixed keys', () => {
                const mixedFile = phpUnitProject('tests/DataProviderAttributeTest.php');
                const mixedContent = `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\DataProvider;
use PHPUnit\\Framework\\TestCase;

class DataProviderAttributeTest extends TestCase
{
    #[DataProvider('attributeProvider')]
    public function testAttributeProvider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function attributeProvider(): array
    {
        return [
            'a' => [2, 3, 7],
            [4, 5, 9],
            [1, 2, 3],
            'b' => [2, 3, 7],
        ];
    }
}`;
                expect(givenTest(mixedFile, mixedContent, 'testAttributeProvider')).toEqual(
                    expect.objectContaining({
                        type: TestType.method,
                        id: 'Data Provider Attribute (Tests\\DataProviderAttribute)::Attribute provider',
                        label: 'testAttributeProvider',
                        methodName: 'testAttributeProvider',
                        annotations: {
                            dataProvider: ['attributeProvider'],
                            dataset: ['data set "a"', 'data set #0', 'data set #1', 'data set "b"'],
                        },
                    }),
                );
            });

            it('parses the Depends attribute', () => {
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

            it('parses the TestDox attribute', () => {
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

        it('reads annotation tags case-insensitively', () => {
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

        it('parses @group annotations', () => {
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

        it('parses #[Group] attributes', () => {
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

        it('parses a single @group annotation', () => {
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

        describe('docblock annotations', () => {
            const file = phpUnitProject('tests/AnnotationTest.php');
            const givenMethod = (docblock: string) =>
                givenTest(
                    file,
                    `<?php

namespace Tests;

use PHPUnit\\Framework\\TestCase;

class AnnotationTest extends TestCase
{
    public function testProducer() {}

    /**
${docblock}
     */
    public function annotated($a = null, $b = null) {}
}
`,
                    'annotated',
                );

            it('keeps a tag on the line after a tag without a value', () => {
                expect(
                    givenMethod('     * @test\n     * @depends testProducer')?.annotations,
                ).toEqual({
                    depends: ['testProducer'],
                });
            });

            it('depends drops the clone modifier', () => {
                expect(
                    givenMethod(
                        '     * @test\n     * @depends clone testProducer\n     * @depends !clone testProducer',
                    )?.annotations,
                ).toEqual({ depends: ['testProducer', 'testProducer'] });
            });

            it('depends on another class is not taken as a method name', () => {
                expect(
                    givenMethod('     * @depends OtherTest::testProducer\n     * @test')
                        ?.annotations,
                ).toEqual({});
            });

            it('ticket and size annotations are groups', () => {
                expect(
                    givenMethod(
                        '     * @test\n     * @ticket 123\n     * @small\n     * @group slow',
                    )?.annotations,
                ).toEqual({ group: ['123', 'small', 'slow'] });
            });

            it('testWith rows are data sets', () => {
                expect(
                    givenMethod('     * @test\n     * @testWith [1, 2]\n     *           [3, 4]')
                        ?.annotations,
                ).toEqual({ dataset: ['data set #0', 'data set #1'] });
            });
        });

        describe('attributes', () => {
            const file = phpUnitProject('tests/AttributeMetadataTest.php');
            const givenMethod = (uses: string, attributes: string, method = 'subject') =>
                givenTest(
                    file,
                    `<?php

namespace Tests;

${uses}
use PHPUnit\\Framework\\TestCase;

class AttributeMetadataTest extends TestCase
{
    public function testProducer() {}

    ${attributes}
    public function ${method}() {}
}
`,
                    method,
                );

            it('resolves an aliased attribute', () => {
                expect(
                    givenMethod('use PHPUnit\\Framework\\Attributes\\Test as T;', '#[T]'),
                ).toBeDefined();
            });

            it('resolves an attribute through a namespace alias', () => {
                expect(
                    givenMethod('use PHPUnit\\Framework\\Attributes as PA;', '#[PA\\Test]'),
                ).toBeDefined();
            });

            it('ignores an attribute of the same name from another namespace', () => {
                expect(givenMethod('use App\\Attributes\\Test;', '#[Test]')).toBeUndefined();
            });

            it('targets in another class are not taken as method names', () => {
                expect(
                    givenMethod(
                        'use PHPUnit\\Framework\\Attributes\\{DataProviderExternal, DependsExternal, DependsOnClass};',
                        "#[DependsExternal(OtherTest::class, 'testProducer'), DataProviderExternal(Provider::class, 'rows'), DependsOnClass(OtherTest::class)]",
                        'testSubject',
                    )?.annotations,
                ).toEqual({});
            });

            it('depends using a clone keeps the method name', () => {
                expect(
                    givenMethod(
                        'use PHPUnit\\Framework\\Attributes\\DependsUsingDeepClone;',
                        "#[DependsUsingDeepClone('testProducer')]",
                        'testSubject',
                    )?.annotations,
                ).toEqual({ depends: ['testProducer'] });
            });

            it('ticket and size attributes are groups', () => {
                expect(
                    givenMethod(
                        'use PHPUnit\\Framework\\Attributes\\{Small, Ticket};',
                        "#[Ticket('123'), Small]",
                        'testSubject',
                    )?.annotations,
                ).toEqual({ group: ['123', 'small'] });
            });
        });

        describe('metadata kept beyond what PHPUnit reads', () => {
            const file = phpUnitProject('tests/SupersetTest.php');
            const givenMethod = (metadata: string, method = 'subject') =>
                givenTest(
                    file,
                    `<?php

namespace Tests;

use PHPUnit\\Framework\\Attributes\\Group;
use PHPUnit\\Framework\\TestCase;

class SupersetTest extends TestCase
{
    public function testProducer() {}

${metadata}
    public function ${method}() {}
}
`,
                    method,
                );

            it('a line comment @test marks a test', () => {
                expect(givenMethod('    // @test')).toBeDefined();
            });

            it('an attribute overrides a docblock annotation of the same kind', () => {
                expect(
                    givenMethod(
                        "    /**\n     * @group b\n     */\n    #[Group('a')]",
                        'testSubject',
                    )?.annotations,
                ).toEqual({ group: ['a'] });
            });

            it('attributes and docblock annotations of different kinds are combined', () => {
                expect(
                    givenMethod(
                        "    /**\n     * @depends testProducer\n     */\n    #[Group('a')]",
                        'testSubject',
                    )?.annotations,
                ).toEqual({ group: ['a'], depends: ['testProducer'] });
            });
        });
    },
);
