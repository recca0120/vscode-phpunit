import { beforeAll, describe, expect, it } from 'vitest';
import type {
    AstNode,
    CallNode,
    ClassNode,
    ExpressionStatementNode,
    MethodNode,
} from './AstParser/AstNode';

type MethodWithClass = { method: MethodNode; classBody: AstNode[] };

import type { AstParser } from './AstParser/AstParser';
import { PhpParserAstParser } from './AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from './AstParser/TreeSitter/TreeSitterAstParser';
import { initTreeSitter } from './AstParser/TreeSitter/TreeSitterParser';
import { resolveLabels } from './Expressions/PhpExpression';

const parseDataProvider = (node: AstNode, classBody?: AstNode[]) => resolveLabels(node, classBody);

const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];

beforeAll(async () => initTreeSitter());

function findMethod(ast: AstNode, name: string): MethodNode {
    const { method } = findMethodWithClass(ast, name);
    return method;
}

function findMethodWithClass(ast: AstNode, name: string): MethodWithClass {
    const classes = ast.kind === 'program' ? (ast as { children: AstNode[] }).children : [ast];
    for (const node of classes) {
        if (node.kind === 'class_declaration') {
            const classNode = node as ClassNode;
            const method = classNode.body.find(
                (m): m is MethodNode => m.kind === 'method_declaration' && m.name === name,
            );
            if (method) {
                return { method, classBody: classNode.body };
            }
        }
    }
    throw new Error(`Method "${name}" not found in AST`);
}

function findWithArrayArg(ast: AstNode): AstNode {
    const children = ast.kind === 'program' ? (ast as { children: AstNode[] }).children : [];
    for (const child of children) {
        if (child.kind !== 'expression_statement') {
            continue;
        }
        const call = findCallChain(
            (child as ExpressionStatementNode).expression as CallNode,
            'with',
        );
        if (call?.arguments[0]) {
            return call.arguments[0];
        }
    }
    throw new Error('with() call not found in AST');
}

function findCallChain(node: CallNode, name: string): CallNode | undefined {
    if (node.name === name) {
        return node;
    }
    if (node.chain) {
        return findCallChain(node.chain, name);
    }
    return undefined;
}

describe.each(parsers)('DataProviderParser (%s)', (_name, createParser) => {
    const givenMethod = (code: string, methodName: string) => {
        const ast = createParser().parse(code, 'test.php');
        return findMethod(ast as AstNode, methodName);
    };

    const givenMethodWithClass = (code: string, methodName: string) => {
        const ast = createParser().parse(code, 'test.php');
        return findMethodWithClass(ast as AstNode, methodName);
    };

    const givenPestArray = (code: string) => {
        const ast = createParser().parse(code, 'test.php');
        return findWithArrayArg(ast as AstNode);
    };

    describe('provider method body', () => {
        it('return array with named keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['foo' => [1, 2, 3], 'bar' => [4, 5, 9]];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"foo"', '"bar"']);
        });

        it('return array with numeric keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return [[0, 0, 0], [0, 1, 1]];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0', '#1']);
        });

        it('return array with mixed keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['first' => [1, 2, 3], [4, 5, 9], 'third' => [7, 8, 15]];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"first"', '#0', '"third"']);
        });

        it('return array with mixed keys — named first then numeric', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['two plus three' => [2, 3, 5], [4, 5, 9]];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"two plus three"', '#0']);
        });

        it('return array with multiple numeric entries among named keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return [[1, 1, 2], 'named' => [2, 3, 5], [4, 5, 9]];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0', '"named"', '#1']);
        });

        it('return array with named keys wrapping numeric entries', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return ['a' => [2, 3, 7], [4, 5, 9], [1, 2, 3], 'b' => [2, 3, 7]];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"a"', '#0', '#1', '"b"']);
        });

        it('yield with named keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield 'first' => [1, 2, 3];
                        yield 'second' => [4, 5, 9];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"first"', '"second"']);
        });

        it('yield with variable key', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $variable = 'xxx';
                        yield $variable => [1, 2, 3];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"xxx"']);
        });

        it('yield with interpolated key using body variable', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 1;
                        yield "case $i" => [1, 2, 3];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"case 1"']);
        });

        it('yield with concatenation key', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $v = 'hello';
                        yield $v . '_suffix' => [1, 2, 3];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello_suffix"']);
        });

        it('yield without keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield [0, 0, 0];
                        yield [0, 1, 1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0', '#1']);
        });

        it('return array_map with range as second argument', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(fn($x) => [$x, $x], range(0, 2));
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0', '#1', '#2']);
        });

        it('empty method body returns empty', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {}
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual([]);
        });

        it('yield inside for loop with interpolated keys', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield "case $i" => [$i];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"case 0"', '"case 1"', '"case 2"']);
        });

        it('yield inside foreach loop with array literal', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['alpha', 'beta', 'gamma'] as $v) {
                            yield $v => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"alpha"', '"beta"', '"gamma"']);
        });

        it('yield inside foreach loop with class constant', () => {
            const { method, classBody } = givenMethodWithClass(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    const CASES = ['alpha', 'beta', 'gamma'];
                    public static function provider() {
                        foreach (self::CASES as $v) {
                            yield $v => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method, classBody)).toEqual(['"alpha"', '"beta"', '"gamma"']);
        });
    });

    describe('advanced loop patterns', () => {
        it('yield inside foreach with range() call', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (range(1, 3) as $i) {
                            yield "case $i" => [$i];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"case 1"', '"case 2"', '"case 3"']);
        });

        it('yield inside while loop', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 0;
                        while ($i < 3) {
                            yield "item $i" => [$i];
                            $i++;
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"item 0"', '"item 1"', '"item 2"']);
        });

        it('yield inside while loop with $i += 2', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 0;
                        while ($i < 6) {
                            yield "item $i" => [$i];
                            $i += 2;
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"item 0"', '"item 2"', '"item 4"']);
        });

        it('yield inside while loop with $i -= 1', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        $i = 3;
                        while ($i > 0) {
                            yield "item $i" => [$i];
                            $i -= 1;
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"item 3"', '"item 2"', '"item 1"']);
        });

        it('yield inside while loop with $i += $step variable', () => {
            const method = givenMethod(
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
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"item 0"', '"item 3"', '"item 6"']);
        });

        it('yield inside nested foreach loops', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['a', 'b'] as $letter) {
                            foreach ([1, 2] as $num) {
                                yield "$letter$num" => [$letter, $num];
                            }
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"a1"', '"a2"', '"b1"', '"b2"']);
        });

        it('yield key with string concatenation', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['x', 'y'] as $v) {
                            yield $v . '_test' => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"x_test"', '"y_test"']);
        });

        it('yield key with ternary expression', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield ($i > 0 ? "positive $i" : "zero") => [$i];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"zero"', '"positive 1"', '"positive 2"']);
        });
        it('while loop with break', () => {
            const method = givenMethod(
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
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"item 0"', '"item 1"', '"item 2"']);
        });

        it('while loop with continue', () => {
            const method = givenMethod(
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
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"item 1"', '"item 3"', '"item 5"']);
        });

        it('yield key with strtoupper', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['hello'] as $v) {
                            yield strtoupper($v) => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"HELLO"']);
        });

        it('yield key with strtolower', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['WORLD'] as $v) {
                            yield strtolower($v) => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"world"']);
        });

        it('yield key with ucfirst', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['foo'] as $v) {
                            yield ucfirst($v) => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"Foo"']);
        });

        it('yield key with sprintf', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield sprintf('case_%d', $i) => [$i];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"case_0"', '"case_1"', '"case_2"']);
        });

        it('yield key with sprintf zero-padded', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        for ($i = 0; $i < 3; $i++) {
                            yield sprintf('case_%02d', $i) => [$i];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"case_00"', '"case_01"', '"case_02"']);
        });

        it('yield key with sprintf multiple args', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['x'] as $a) {
                            foreach ([1, 2] as $b) {
                                yield sprintf('%s-%d', $a, $b) => [$a, $b];
                            }
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"x-1"', '"x-2"']);
        });

        it('yield key with implode', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['a', 'b'] as $x) {
                            foreach ([1, 2] as $y) {
                                yield implode('-', [$x, $y]) => [$x, $y];
                            }
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"a-1"', '"a-2"', '"b-1"', '"b-2"']);
        });

        it('yield key with join (alias of implode)', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        foreach (['x', 'y'] as $v) {
                            yield join('_', [$v, 'test']) => [$v];
                        }
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"x_test"', '"y_test"']);
        });

        it('yield key with str_repeat', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_repeat('ab', 3) => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"ababab"']);
        });

        it('yield key with substr', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield substr('hello_world', 0, 5) => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello"']);
        });

        it('yield key with trim', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield trim(' hello ') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello"']);
        });

        it('yield key with rtrim', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield rtrim('hello  ') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello"']);
        });

        it('yield key with ltrim', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield ltrim('  hello') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello"']);
        });

        it('yield key with lcfirst', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield lcfirst('Hello') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello"']);
        });

        it('yield key with str_replace', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_replace('_', '-', 'foo_bar') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"foo-bar"']);
        });

        it('yield key with sprintf %s only', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield sprintf('hello %s', 'world') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"hello world"']);
        });

        it('yield key with implode all literals', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield implode(',', ['a', 'b', 'c']) => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"a,b,c"']);
        });

        it('yield key with implode empty separator', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield implode('', ['x', 'y']) => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"xy"']);
        });

        it('yield key with str_repeat zero count', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_repeat('ab', 0) => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['""']);
        });

        it('yield key with substr without length', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield substr('hello_world', 6) => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"world"']);
        });

        it('yield key with str_replace multiple occurrences', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield str_replace('_', '-', 'a_b_c') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"a-b-c"']);
        });

        it('yield key with unknown function falls back to numeric', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        yield unknownFunc('x') => [1];
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0']);
        });

        it('return array_map with arrow function', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(fn($x) => [$x, $x * 2], ['a', 'b', 'c']);
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0', '#1', '#2']);
        });

        it('return array_map with long function', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(function($x) { return [$x]; }, ['a', 'b', 'c']);
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['#0', '#1', '#2']);
        });

        it('return array_combine with keys and values', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_combine(['foo', 'bar', 'baz'], [[1], [2], [3]]);
                    }
                }`,
                'provider',
            );
            expect(parseDataProvider(method)).toEqual(['"foo"', '"bar"', '"baz"']);
        });
    });

    describe('inline array (Pest ->with())', () => {
        it('array with named keys', () => {
            const arrayNode = givenPestArray(
                `<?php it('test')->with(['alice' => [1], 'bob' => [2]]);`,
            );
            expect(parseDataProvider(arrayNode)).toEqual(['"alice"', '"bob"']);
        });

        it('array with numeric keys', () => {
            const arrayNode = givenPestArray(`<?php it('test')->with([[1, 2], [3, 4]]);`);
            expect(parseDataProvider(arrayNode)).toEqual(['#0', '#1']);
        });
    });

    describe('Pest ->with(fn() => ...) arrow function', () => {
        it('arrow function returning range()', () => {
            const node = givenPestArray(`<?php it('test')->with(fn() => range(1, 3));`);
            expect(parseDataProvider(node)).toEqual(['#0', '#1', '#2']);
        });

        it('arrow function returning array literal', () => {
            const node = givenPestArray(`<?php it('test')->with(fn() => ['a', 'b']);`);
            expect(parseDataProvider(node)).toEqual(['#0', '#1']);
        });

        it('arrow function returning unresolvable expression', () => {
            const node = givenPestArray(`<?php it('test')->with(fn() => User::all());`);
            expect(parseDataProvider(node)).toEqual([]);
        });
    });
});
