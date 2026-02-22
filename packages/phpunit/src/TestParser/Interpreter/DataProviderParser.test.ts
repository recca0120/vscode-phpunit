import { beforeAll, describe, expect, it } from 'vitest';
import type {
    AstNode,
    CallNode,
    ClassNode,
    ExpressionStatementNode,
    MethodNode,
} from '../AstParser/AstNode';

type MethodWithClass = { method: MethodNode; classBody: AstNode[] };

import type { AstParser } from '../AstParser/AstParser';
import { PhpParserAstParser } from '../AstParser/php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from '../AstParser/tree-sitter/TreeSitterAstParser';
import { initTreeSitter } from '../AstParser/tree-sitter/TreeSitterParser';
import { dataProviderParser } from './DataProviderParser';

const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];

beforeAll(async () => initTreeSitter());

const parser = dataProviderParser;

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
            expect(parser.parse(method)).toEqual(['"foo"', '"bar"']);
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
            expect(parser.parse(method)).toEqual(['#0', '#1']);
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
            expect(parser.parse(method)).toEqual(['"first"', '#0', '"third"']);
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
            expect(parser.parse(method)).toEqual(['"two plus three"', '#0']);
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
            expect(parser.parse(method)).toEqual(['#0', '"named"', '#1']);
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
            expect(parser.parse(method)).toEqual(['"a"', '#0', '#1', '"b"']);
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
            expect(parser.parse(method)).toEqual(['"first"', '"second"']);
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
            expect(parser.parse(method)).toEqual(['#0', '#1']);
        });

        it('unresolvable array_map returns empty', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {
                        return array_map(fn($x) => [$x, $x], range(0, 2));
                    }
                }`,
                'provider',
            );
            expect(parser.parse(method)).toEqual([]);
        });

        it('empty method body returns empty', () => {
            const method = givenMethod(
                `<?php class FooTest extends \\PHPUnit\\Framework\\TestCase {
                    public static function provider() {}
                }`,
                'provider',
            );
            expect(parser.parse(method)).toEqual([]);
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
            expect(parser.parse(method)).toEqual(['"case 0"', '"case 1"', '"case 2"']);
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
            expect(parser.parse(method)).toEqual(['"alpha"', '"beta"', '"gamma"']);
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
            expect(parser.parse(method, classBody)).toEqual(['"alpha"', '"beta"', '"gamma"']);
        });
    });

    describe('inline array (Pest ->with())', () => {
        it('array with named keys', () => {
            const arrayNode = givenPestArray(
                `<?php it('test')->with(['alice' => [1], 'bob' => [2]]);`,
            );
            expect(parser.parse(arrayNode)).toEqual(['"alice"', '"bob"']);
        });

        it('array with numeric keys', () => {
            const arrayNode = givenPestArray(`<?php it('test')->with([[1, 2], [3, 4]]);`);
            expect(parser.parse(arrayNode)).toEqual(['#0', '#1']);
        });
    });
});
