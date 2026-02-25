import { beforeAll, describe, expect, it } from 'vitest';
import type { AstNode } from './AstParser/AstNode';
import type { AstParser } from './AstParser/AstParser';
import { PhpParserAstParser } from './AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from './AstParser/TreeSitter/TreeSitterAstParser';
import { initTreeSitter } from './AstParser/TreeSitter/TreeSitterParser';
import { interpret } from './PHP';

const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];

beforeAll(async () => initTreeSitter());

describe.each(parsers)('interpret (%s)', (_name, createParser) => {
    const given = (code: string) => {
        const ast = createParser().parse(code, 'test.php') as AstNode;
        return interpret(ast);
    };

    describe('namespace and classes', () => {
        it('extracts namespace and class FQN', () => {
            const info = given(`<?php
                namespace Tests;
                use PHPUnit\\Framework\\TestCase;
                class FooTest extends TestCase {}
            `);
            expect(info.namespace).toBe('Tests');
            expect(info.classes).toHaveLength(1);
            expect(info.classes[0].name).toBe('FooTest');
            expect(info.classes[0].fqn).toBe('Tests\\FooTest');
            expect(info.classes[0].parentFQN).toBe('PHPUnit\\Framework\\TestCase');
        });

        it('handles no namespace', () => {
            const info = given(`<?php
                class FooTest extends \\PHPUnit\\Framework\\TestCase {}
            `);
            expect(info.namespace).toBeUndefined();
            expect(info.classes[0].fqn).toBe('FooTest');
            expect(info.classes[0].parentFQN).toBe('PHPUnit\\Framework\\TestCase');
        });

        it('handles abstract class', () => {
            const info = given(`<?php
                namespace Tests;
                abstract class BaseTest extends \\PHPUnit\\Framework\\TestCase {}
            `);
            expect(info.classes[0].isAbstract).toBe(true);
        });

        it('handles trait', () => {
            const info = given(`<?php
                namespace Tests;
                trait TestHelpers {
                    public function testHelper() {}
                }
            `);
            expect(info.classes[0].isTrait).toBe(true);
        });
    });

    describe('methods', () => {
        it('identifies test methods', () => {
            const info = given(`<?php
                namespace Tests;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public function testFoo() {}
                    public function helper() {}
                    private function testPrivate() {}
                }
            `);
            const methods = info.classes[0].methods;
            expect(methods).toHaveLength(3);
            expect(methods[0].name).toBe('testFoo');
            expect(methods[0].isTestMethod).toBe(true);
            expect(methods[1].name).toBe('helper');
            expect(methods[1].isTestMethod).toBe(false);
            expect(methods[2].name).toBe('testPrivate');
            expect(methods[2].isTestMethod).toBe(false);
        });

        it('recognizes @test annotation', () => {
            const info = given(`<?php
                namespace Tests;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    /** @test */
                    public function it_does_something() {}
                }
            `);
            expect(info.classes[0].methods[0].isTestMethod).toBe(true);
        });

        it('recognizes #[Test] attribute', () => {
            const info = given(`<?php
                namespace Tests;
                use PHPUnit\\Framework\\Attributes\\Test;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    #[Test]
                    public function it_does_something() {}
                }
            `);
            expect(info.classes[0].methods[0].isTestMethod).toBe(true);
        });

        it('extracts method annotations', () => {
            const info = given(`<?php
                namespace Tests;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    /**
                     * @dataProvider additionProvider
                     * @group math
                     */
                    public function testAdd() {}
                }
            `);
            const annotations = info.classes[0].methods[0].annotations;
            expect(annotations.dataProvider).toEqual(['additionProvider']);
            expect(annotations.group).toEqual(['math']);
        });
    });

    describe('data providers', () => {
        it('resolves data provider labels', () => {
            const info = given(`<?php
                namespace Tests;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    /**
                     * @dataProvider additionProvider
                     */
                    public function testAdd() {}

                    public static function additionProvider() {
                        return ['a' => [1, 2, 3], 'b' => [4, 5, 9]];
                    }
                }
            `);
            expect(info.classes[0].methods[0].dataProviderLabels).toEqual([
                'data set "a"',
                'data set "b"',
            ]);
        });

        it('resolves #[DataProvider] attribute', () => {
            const info = given(`<?php
                namespace Tests;
                use PHPUnit\\Framework\\Attributes\\DataProvider;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    #[DataProvider('additionProvider')]
                    public function testAdd() {}

                    public static function additionProvider() {
                        return ['x' => [1], 'y' => [2]];
                    }
                }
            `);
            expect(info.classes[0].methods[0].dataProviderLabels).toEqual([
                'data set "x"',
                'data set "y"',
            ]);
        });

        it('handles #[TestWith] dataset', () => {
            const info = given(`<?php
                namespace Tests;
                use PHPUnit\\Framework\\Attributes\\TestWith;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    #[TestWith([1, 2, 3], 'first')]
                    #[TestWith([4, 5, 9])]
                    public function testAdd() {}
                }
            `);
            expect(info.classes[0].methods[0].dataProviderLabels).toEqual([
                'data set "first"',
                'data set #1',
            ]);
        });
    });

    describe('trait uses', () => {
        it('collects trait uses', () => {
            const info = given(`<?php
                namespace Tests;
                use Tests\\Traits\\HelperTrait;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    use HelperTrait;
                }
            `);
            expect(info.classes[0].traitUses).toHaveLength(1);
            expect(info.classes[0].traitUses[0].traitFQN).toBe('Tests\\Traits\\HelperTrait');
        });
    });

    describe('constants', () => {
        it('collects class constants', () => {
            const info = given(`<?php
                namespace Tests;
                class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    const CASES = ['a', 'b', 'c'];
                    public function testFoo() {}
                }
            `);
            expect(info.classes[0].constants).toHaveLength(1);
            expect(info.classes[0].constants[0].name).toBe('CASES');
        });
    });

    describe('pest calls', () => {
        it('collects simple test calls', () => {
            const info = given(`<?php
                test('it works', function () {
                    expect(true)->toBeTrue();
                });
            `);
            expect(info.pestCalls).toHaveLength(1);
            expect(info.pestCalls[0].fnName).toBe('test');
            expect(info.pestCalls[0].description).toBe('it works');
        });

        it('collects it() calls', () => {
            const info = given(`<?php
                it('does something', function () {});
            `);
            expect(info.pestCalls).toHaveLength(1);
            expect(info.pestCalls[0].fnName).toBe('it');
            expect(info.pestCalls[0].description).toBe('does something');
        });

        it('collects describe blocks with children', () => {
            const info = given(`<?php
                describe('math', function () {
                    it('adds', function () {});
                    it('subtracts', function () {});
                });
            `);
            expect(info.pestCalls).toHaveLength(1);
            expect(info.pestCalls[0].fnName).toBe('describe');
            expect(info.pestCalls[0].description).toBe('math');
            expect(info.pestCalls[0].children).toHaveLength(2);
            expect(info.pestCalls[0].children[0].description).toBe('adds');
        });

        it('collects datasets from ->with()', () => {
            const info = given(`<?php
                it('test', function ($a) {})->with(['alice' => [1], 'bob' => [2]]);
            `);
            expect(info.pestCalls[0].datasets).toEqual([
                'data set "dataset "alice""',
                'data set "dataset "bob""',
            ]);
        });

        it('collects datasets from generator ->with()', () => {
            const info = given(`<?php
                it('test', function ($a) {})->with(function () {
                    yield 'one' => [1];
                    yield 'two' => [2];
                });
            `);
            expect(info.pestCalls[0].datasets).toEqual([
                'data set "dataset "one""',
                'data set "dataset "two""',
            ]);
        });

        it('handles Cartesian product from multiple ->with()', () => {
            const info = given(`<?php
                it('test', function ($a, $b) {})
                    ->with(['Office', 'Bank'])
                    ->with(['Saturday', 'Sunday']);
            `);
            expect(info.pestCalls[0].datasets).toEqual([
                `data set "('Office') / ('Saturday')"`,
                `data set "('Office') / ('Sunday')"`,
                `data set "('Bank') / ('Saturday')"`,
                `data set "('Bank') / ('Sunday')"`,
            ]);
        });

        it('collects arch() calls', () => {
            const info = given(`<?php
                arch()->preset()->php();
            `);
            expect(info.pestCalls).toHaveLength(1);
            expect(info.pestCalls[0].fnName).toBe('arch');
        });
    });
});
