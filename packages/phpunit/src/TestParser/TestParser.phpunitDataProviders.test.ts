import { beforeAll, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../test-support/fixtures';
import { parsers } from '../../test-support/parsers';
import { findTest, parseTestFile } from '../../test-support/parsing';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { TestType } from '../types';

const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, phpUnitProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('TestParser on PHPUnit data providers (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) =>
        findTest(parse(content, file, createParser()), id);

    describe('several providers on one method (#13)', () => {
        it('concatenates datasets from multiple providers', () => {
            const file = phpUnitProject('tests/MultiProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class MultiProviderTest extends TestCase
{
    /**
     * @dataProvider providerA
     * @dataProvider providerB
     */
    public function test_add(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function providerA(): array
    {
        return ['one plus one' => [1, 1, 2]];
    }

    public static function providerB(): array
    {
        return [[2, 3, 5]];
    }
}`;
            expect(givenTest(file, content, 'test_add')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    id: 'Multi Provider (Tests\\MultiProvider)::Add',
                    label: 'test_add',
                    methodName: 'test_add',
                    annotations: {
                        dataProvider: ['providerA', 'providerB'],
                        dataset: ['data set "one plus one"', 'data set #0'],
                    },
                }),
            );
        });

        it('concatenates datasets from multiple #[DataProvider] attributes', () => {
            const file = phpUnitProject('tests/MultiAttrProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\DataProvider;
use PHPUnit\\Framework\\TestCase;

class MultiAttrProviderTest extends TestCase
{
    #[DataProvider('providerA')]
    #[DataProvider('providerB')]
    public function test_add(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function providerA(): array
    {
        return ['one plus one' => [1, 1, 2]];
    }

    public static function providerB(): array
    {
        return [[2, 3, 5]];
    }
}`;
            expect(givenTest(file, content, 'test_add')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    id: 'Multi Attr Provider (Tests\\MultiAttrProvider)::Add',
                    label: 'test_add',
                    methodName: 'test_add',
                    annotations: {
                        dataProvider: ['providerA', 'providerB'],
                        dataset: ['data set "one plus one"', 'data set #0'],
                    },
                }),
            );
        });

        it('continues integer data set numbering across multiple providers', () => {
            const file = phpUnitProject('tests/MultiProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class MultiProviderTest extends TestCase
{
    /**
     * @dataProvider providerA
     * @dataProvider providerB
     */
    public function test_add(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function providerA(): array
    {
        return [[1, 1, 2]];
    }

    public static function providerB(): array
    {
        return [[2, 3, 5]];
    }
}`;
            expect(givenTest(file, content, 'test_add')).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['providerA', 'providerB'],
                        dataset: ['data set #0', 'data set #1'],
                    },
                }),
            );
        });

        it('provider with an unresolvable key has no static labels', () => {
            const file = phpUnitProject('tests/UnresolvableKeyTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class UnresolvableKeyTest extends TestCase
{
    /**
     * @dataProvider provider
     */
    public function test_add(int $a): void
    {
        $this->assertSame($a, $a);
    }

    public static function provider(): array
    {
        return [PHP_VERSION => [1]];
    }
}`;
            expect(givenTest(file, content, 'test_add')).toEqual(
                expect.objectContaining({
                    annotations: { dataProvider: ['provider'] },
                }),
            );
        });

        it('provider with null and false keys casts them like PHP array keys', () => {
            const file = phpUnitProject('tests/CastKeyTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class CastKeyTest extends TestCase
{
    /**
     * @dataProvider provider
     */
    public function test_add(int $a): void
    {
        $this->assertSame($a, $a);
    }

    public static function provider(): array
    {
        return [null => [1], false => [2]];
    }
}`;
            expect(givenTest(file, content, 'test_add')).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: ['data set ""', 'data set #0'],
                    },
                }),
            );
        });
    });

    describe('yield and loop providers', () => {
        it('labels a yield provider by its named keys', () => {
            const yieldFile = phpUnitProject('tests/DataProviderAnnotationTest.php');
            const yieldContent = `<?php
namespace Tests;

use Generator;
use PHPUnit\\Framework\\TestCase;

class DataProviderAnnotationTest extends TestCase
{
    /**
     * @dataProvider generatorProvider
     */
    public function test_generator_provider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function generatorProvider(): Generator
    {
        yield 'yield one' => [1, 0, 1];
        yield 'yield two' => [0, 1, 1];
    }
}`;
            expect(givenTest(yieldFile, yieldContent, 'test_generator_provider')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    id: 'Data Provider Annotation (Tests\\DataProviderAnnotation)::Generator provider',
                    label: 'test_generator_provider',
                    methodName: 'test_generator_provider',
                    annotations: {
                        dataProvider: ['generatorProvider'],
                        dataset: ['data set "yield one"', 'data set "yield two"'],
                    },
                }),
            );
        });

        it('numbers a yield provider without keys', () => {
            const yieldFile = phpUnitProject('tests/DataProviderAnnotationTest.php');
            const yieldContent = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class YieldNoKeyTest extends TestCase
{
    /**
     * @dataProvider numericProvider
     */
    public function test_numeric_yield(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function numericProvider()
    {
        yield [0, 0, 0];
        yield [0, 1, 1];
    }
}`;
            expect(givenTest(yieldFile, yieldContent, 'test_numeric_yield')).toEqual(
                expect.objectContaining({
                    type: TestType.method,
                    id: 'Yield No Key (Tests\\YieldNoKey)::Numeric yield',
                    label: 'test_numeric_yield',
                    methodName: 'test_numeric_yield',
                    annotations: {
                        dataProvider: ['numericProvider'],
                        dataset: ['data set #0', 'data set #1'],
                    },
                }),
            );
        });

        const givenProviderTest = (providerBody: string) => {
            const file = phpUnitProject('tests/LoopProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class LoopProviderTest extends TestCase
{
    /**
     * @dataProvider provider
     */
    public function test_loop(int $a): void
    {
        $this->assertSame($a, $a);
    }

    public static function provider(): iterable
    {
        ${providerBody}
    }
}`;
            return givenTest(file, content, 'test_loop');
        };

        it('for loop starting from a constant has no static labels', () => {
            expect(
                givenProviderTest('for ($i = START; $i < 2; $i++) { yield "case $i" => [$i]; }'),
            ).toEqual(expect.objectContaining({ annotations: { dataProvider: ['provider'] } }));
        });

        it('for loop bounded by a constant has no static labels', () => {
            expect(
                givenProviderTest('for ($i = 2; $i > LIMIT; $i--) { yield "case $i" => [$i]; }'),
            ).toEqual(expect.objectContaining({ annotations: { dataProvider: ['provider'] } }));
        });

        it('for loop with an unsupported update has no static labels', () => {
            expect(
                givenProviderTest('for ($i = 0; $i < 3; $i += 1) { yield "case $i" => [$i]; }'),
            ).toEqual(expect.objectContaining({ annotations: { dataProvider: ['provider'] } }));
        });

        it('while loop bounded by a constant has no static labels', () => {
            expect(
                givenProviderTest('$i = 2; while ($i > LIMIT) { yield "case $i" => [$i]; $i--; }'),
            ).toEqual(expect.objectContaining({ annotations: { dataProvider: ['provider'] } }));
        });

        it('while loop counter assigned from a constant has no static labels', () => {
            expect(
                givenProviderTest('$i = START; while ($i < 2) { yield "case $i" => [$i]; $i++; }'),
            ).toEqual(expect.objectContaining({ annotations: { dataProvider: ['provider'] } }));
        });

        it('resolves a foreach over a parenthesized array', () => {
            expect(givenProviderTest("foreach ((['x', 'y']) as $v) { yield $v => [$v]; }")).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: ['data set "x"', 'data set "y"'],
                    },
                }),
            );
        });

        it('reads a class constant in a nested provider loop', () => {
            const file = phpUnitProject('tests/NestedLoopProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class NestedLoopProviderTest extends TestCase
{
    const CASES = ['alpha', 'beta'];

    /**
     * @dataProvider provider
     */
    public function test_loop(int $a): void
    {
        $this->assertSame($a, $a);
    }

    public static function provider(): iterable
    {
        foreach ([1, 2] as $i) {
            foreach (self::CASES as $case) {
                yield $case . $i => [$i];
            }
        }
    }
}`;

            expect(givenTest(file, content, 'test_loop')).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: [
                            'data set "alpha1"',
                            'data set "beta1"',
                            'data set "alpha2"',
                            'data set "beta2"',
                        ],
                    },
                }),
            );
        });

        it('uses an element of the looped array row as the data set key', () => {
            expect(
                givenProviderTest(
                    "foreach ([['a', 1], ['b', 2]] as $row) { yield $row[0] => [$row[1]]; }",
                ),
            ).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: ['data set "a"', 'data set "b"'],
                    },
                }),
            );
        });

        it('does not read its own constant for another class constant', () => {
            const file = phpUnitProject('tests/OtherClassConstantProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class OtherClassConstantProviderTest extends TestCase
{
    const CASES = ['own'];

    /**
     * @dataProvider provider
     */
    public function test_loop(string $a): void
    {
        $this->assertSame($a, $a);
    }

    public static function provider(): iterable
    {
        foreach (Other::CASES as $case) {
            yield $case => [$case];
        }
    }
}`;

            expect(givenTest(file, content, 'test_loop')).toEqual(
                expect.objectContaining({ annotations: { dataProvider: ['provider'] } }),
            );
        });

        it('reads its own constant through its class name', () => {
            const file = phpUnitProject('tests/OwnClassConstantProviderTest.php');
            const content = `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class OwnClassConstantProviderTest extends TestCase
{
    const CASES = ['own'];

    /**
     * @dataProvider provider
     */
    public function test_loop(string $a): void
    {
        $this->assertSame($a, $a);
    }

    public static function provider(): iterable
    {
        foreach (OwnClassConstantProviderTest::CASES as $case) {
            yield $case => [$case];
        }
    }
}`;

            expect(givenTest(file, content, 'test_loop')).toEqual(
                expect.objectContaining({
                    annotations: { dataProvider: ['provider'], dataset: ['data set "own"'] },
                }),
            );
        });

        it('labels the data set when its own constant copies a same-named constant of another class (#562)', () => {
            const file = phpUnitProject('tests/Unit/SelfReferenceTest.php');
            const content = `<?php
namespace Tests\\Unit;

use PHPUnit\\Framework\\Attributes\\DataProvider;
use PHPUnit\\Framework\\TestCase;
use Tests\\Support\\Values;

class SelfReferenceTest extends TestCase
{
    private const NAME = Values::NAME;

    public static function nameProvider(): array
    {
        return ['the name' => [self::NAME]];
    }

    #[DataProvider('nameProvider')]
    public function testName(string $name): void
    {
        $this->assertSame('abc', $name);
    }
}`;

            expect(givenTest(file, content, 'testName')).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['nameProvider'],
                        dataset: ['data set "the name"'],
                    },
                }),
            );
        });

        it('decodes escape sequences in a double-quoted data set key', () => {
            expect(givenProviderTest('return ["first\\nsecond" => [1]];')).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: ['data set "first\nsecond"'],
                    },
                }),
            );
        });

        it('loop yielding integer keys is renumbered like PHPUnit', () => {
            expect(givenProviderTest('for ($i = 5; $i < 7; $i++) { yield $i => [$i]; }')).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: ['data set #0', 'data set #1'],
                    },
                }),
            );
        });

        it('returned array with explicit integer keys is renumbered like PHPUnit', () => {
            expect(givenProviderTest("return [5 => [1], 'named' => [2], 7 => [3]];")).toEqual(
                expect.objectContaining({
                    annotations: {
                        dataProvider: ['provider'],
                        dataset: ['data set #0', 'data set "named"', 'data set #1'],
                    },
                }),
            );
        });

        it('loop yield with an unresolvable key has no static labels', () => {
            expect(
                givenProviderTest('for ($i = 0; $i < 2; $i++) { yield PHP_VERSION => [$i]; }'),
            ).toEqual(expect.objectContaining({ annotations: { dataProvider: ['provider'] } }));
        });
    });
});
