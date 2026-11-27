import { beforeAll, describe, expect, it } from 'vitest';
import { parsers } from '../../tests/support/parsers';
import type { AstNode } from './AstParser/AstNode';
import { initTreeSitter } from './AstParser/TreeSitter/TreeSitterParser';
import { interpret } from './PHP';

beforeAll(async () => initTreeSitter());

describe.each(parsers)('interpret: data provider labels (%s)', (_name, createParser) => {
    const givenProviderLabels = (code: string) => {
        const withTestUsingProvider = code.replace(
            /(class \w+[^{]*\{)/,
            '$1\n/** @dataProvider provider */\npublic function test_provided() {}\n',
        );
        const ast = createParser().parse(withTestUsingProvider, 'test.php') as AstNode;
        return interpret(ast)
            .classes.flatMap((cls) => cls.methods)
            .find((method) => method.name === 'test_provided')?.dataProviderLabels;
    };

    describe('provider method body', () => {
        it('return array with named keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['foo' => [1, 2, 3], 'bar' => [4, 5, 9]];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "foo"', 'data set "bar"']);
        });

        it('return array with numeric keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return [[0, 0, 0], [0, 1, 1]];
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0', 'data set #1']);
        });

        it('return array with mixed keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['first' => [1, 2, 3], [4, 5, 9], 'third' => [7, 8, 15]];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "first"', 'data set #0', 'data set "third"']);
        });

        it('return array with mixed keys — named first then numeric', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['two plus three' => [2, 3, 5], [4, 5, 9]];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "two plus three"', 'data set #0']);
        });

        it('return array with multiple numeric entries among named keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return [[1, 1, 2], 'named' => [2, 3, 5], [4, 5, 9]];
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0', 'data set "named"', 'data set #1']);
        });

        it('return array with named keys wrapping numeric entries', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['a' => [2, 3, 7], [4, 5, 9], [1, 2, 3], 'b' => [2, 3, 7]];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "a"', 'data set #0', 'data set #1', 'data set "b"']);
        });

        it('yield with named keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield 'first' => [1, 2, 3];
                        yield 'second' => [4, 5, 9];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "first"', 'data set "second"']);
        });

        it('yield with variable key', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $variable = 'xxx';
                        yield $variable => [1, 2, 3];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "xxx"']);
        });

        it('yield with interpolated key using body variable', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 1;
                        yield "case $i" => [1, 2, 3];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "case 1"']);
        });

        it('yield with concatenation key', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $v = 'hello';
                        yield $v . '_suffix' => [1, 2, 3];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello_suffix"']);
        });

        it('yield without keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield [0, 0, 0];
                        yield [0, 1, 1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0', 'data set #1']);
        });

        it('return array_map with range as second argument', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(fn($x) => [$x, $x], range(0, 2));
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0', 'data set #1', 'data set #2']);
        });

        it('empty method body returns empty', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {}
                }`,
            );
            expect(labels).toEqual([]);
        });

        it('yield inside for loop with interpolated keys', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield "case $i" => [$i];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "case 0"', 'data set "case 1"', 'data set "case 2"']);
        });

        it('yield inside foreach loop with array literal', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['alpha', 'beta', 'gamma'] as $v) {
                            yield $v => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "alpha"', 'data set "beta"', 'data set "gamma"']);
        });

        it('yield inside foreach loop with class constant', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    const CASES = ['alpha', 'beta', 'gamma'];
                    public static function provider() {
                        foreach (self::CASES as $v) {
                            yield $v => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "alpha"', 'data set "beta"', 'data set "gamma"']);
        });
    });

    describe('advanced loop patterns', () => {
        it('yield inside foreach with range() call', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (range(1, 3) as $i) {
                            yield "case $i" => [$i];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "case 1"', 'data set "case 2"', 'data set "case 3"']);
        });

        it('yield inside while loop', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 0;
                        while ($i < 3) {
                            yield "item $i" => [$i];
                            $i++;
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "item 0"', 'data set "item 1"', 'data set "item 2"']);
        });

        it('yield inside while loop with $i += 2', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 0;
                        while ($i < 6) {
                            yield "item $i" => [$i];
                            $i += 2;
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "item 0"', 'data set "item 2"', 'data set "item 4"']);
        });

        it('yield inside while loop with $i -= 1', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 3;
                        while ($i > 0) {
                            yield "item $i" => [$i];
                            $i -= 1;
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "item 3"', 'data set "item 2"', 'data set "item 1"']);
        });

        it('yield inside while loop with $i += $step variable', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $step = 3;
                        $i = 0;
                        while ($i < 9) {
                            yield "item $i" => [$i];
                            $i += $step;
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "item 0"', 'data set "item 3"', 'data set "item 6"']);
        });

        it('yield inside nested foreach loops', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['a', 'b'] as $letter) {
                            foreach ([1, 2] as $num) {
                                yield "$letter$num" => [$letter, $num];
                            }
                        }
                    }
                }`,
            );
            expect(labels).toEqual([
                'data set "a1"',
                'data set "a2"',
                'data set "b1"',
                'data set "b2"',
            ]);
        });

        it('yield key with string concatenation', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['x', 'y'] as $v) {
                            yield $v . '_test' => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "x_test"', 'data set "y_test"']);
        });

        it('yield key with ternary expression', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield ($i > 0 ? "positive $i" : "zero") => [$i];
                        }
                    }
                }`,
            );
            expect(labels).toEqual([
                'data set "zero"',
                'data set "positive 1"',
                'data set "positive 2"',
            ]);
        });
        it('while loop with break', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 0;
                        while ($i < 10) {
                            if ($i >= 3) { break; }
                            yield "item $i" => [$i];
                            $i++;
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "item 0"', 'data set "item 1"', 'data set "item 2"']);
        });

        it('while loop with continue', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 0;
                        while ($i < 5) {
                            $i++;
                            if ($i % 2 === 0) { continue; }
                            yield "item $i" => [$i];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "item 1"', 'data set "item 3"', 'data set "item 5"']);
        });

        it('foreach loop with conditional yield using subscript access', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['apple', 'banana', 'avocado', 'cherry'] as $v) {
                            if ($v[0] === 'a') {
                                yield $v => [$v];
                            }
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "apple"', 'data set "avocado"']);
        });

        it('yield key with strtoupper', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['hello'] as $v) {
                            yield strtoupper($v) => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "HELLO"']);
        });

        it('yield key with strtolower', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['WORLD'] as $v) {
                            yield strtolower($v) => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "world"']);
        });

        it('yield key with ucfirst', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['foo'] as $v) {
                            yield ucfirst($v) => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "Foo"']);
        });

        it('yield key with sprintf', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield sprintf('case_%d', $i) => [$i];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "case_0"', 'data set "case_1"', 'data set "case_2"']);
        });

        it('yield key with sprintf zero-padded', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield sprintf('case_%02d', $i) => [$i];
                        }
                    }
                }`,
            );
            expect(labels).toEqual([
                'data set "case_00"',
                'data set "case_01"',
                'data set "case_02"',
            ]);
        });

        it('yield key with sprintf multiple args', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['x'] as $a) {
                            foreach ([1, 2] as $b) {
                                yield sprintf('%s-%d', $a, $b) => [$a, $b];
                            }
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "x-1"', 'data set "x-2"']);
        });

        it('yield key with implode', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['a', 'b'] as $x) {
                            foreach ([1, 2] as $y) {
                                yield implode('-', [$x, $y]) => [$x, $y];
                            }
                        }
                    }
                }`,
            );
            expect(labels).toEqual([
                'data set "a-1"',
                'data set "a-2"',
                'data set "b-1"',
                'data set "b-2"',
            ]);
        });

        it('yield key with join (alias of implode)', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['x', 'y'] as $v) {
                            yield join('_', [$v, 'test']) => [$v];
                        }
                    }
                }`,
            );
            expect(labels).toEqual(['data set "x_test"', 'data set "y_test"']);
        });

        it('yield key with str_repeat', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_repeat('ab', 3) => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "ababab"']);
        });

        it('yield key with substr', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield substr('hello_world', 0, 5) => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello"']);
        });

        it('yield key with trim', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield trim(' hello ') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello"']);
        });

        it('yield key with rtrim', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield rtrim('hello  ') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello"']);
        });

        it('yield key with ltrim', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield ltrim('  hello') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello"']);
        });

        it('yield key with lcfirst', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield lcfirst('Hello') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello"']);
        });

        it('yield key with str_replace', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_replace('_', '-', 'foo_bar') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "foo-bar"']);
        });

        it('yield key with sprintf %s only', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield sprintf('hello %s', 'world') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "hello world"']);
        });

        it('yield key with implode all literals', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield implode(',', ['a', 'b', 'c']) => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "a,b,c"']);
        });

        it('yield key with implode empty separator', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield implode('', ['x', 'y']) => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "xy"']);
        });

        it('yield key with str_repeat zero count', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_repeat('ab', 0) => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set ""']);
        });

        it('yield key with substr without length', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield substr('hello_world', 6) => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "world"']);
        });

        it('yield key with str_replace multiple occurrences', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_replace('_', '-', 'a_b_c') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set "a-b-c"']);
        });

        it('yield key with unknown function falls back to numeric', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield unknownFunc('x') => [1];
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0']);
        });

        it('return array_map with arrow function', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(fn($x) => [$x, $x * 2], ['a', 'b', 'c']);
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0', 'data set #1', 'data set #2']);
        });

        it('return array_map with long function', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(function($x) { return [$x]; }, ['a', 'b', 'c']);
                    }
                }`,
            );
            expect(labels).toEqual(['data set #0', 'data set #1', 'data set #2']);
        });

        it('return array_combine with keys and values', () => {
            const labels = givenProviderLabels(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_combine(['foo', 'bar', 'baz'], [[1], [2], [3]]);
                    }
                }`,
            );
            expect(labels).toEqual(['data set "foo"', 'data set "bar"', 'data set "baz"']);
        });
    });
});
