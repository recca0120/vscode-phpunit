import { beforeAll, describe, expect, it } from 'vitest';
import type { AstNode, CallNode, ClassNode, ExpressionStatementNode, MethodNode } from './AstNode';
import type { AstParser } from './AstParser';
import { dataProviderParser } from './DataProviderParser';
import { PhpParserAstParser } from './php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from './tree-sitter/TreeSitterAstParser';
import { initTreeSitter } from './tree-sitter/TreeSitterParser';

const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];

beforeAll(async () => initTreeSitter());

const parser = dataProviderParser;

function findMethod(ast: AstNode, name: string): MethodNode {
    const classes = ast.kind === 'program' ? (ast as { children: AstNode[] }).children : [ast];
    for (const node of classes) {
        if (node.kind === 'class_declaration') {
            const method = (node as ClassNode).body.find(
                (m): m is MethodNode => m.kind === 'method_declaration' && m.name === name,
            );
            if (method) {
                return method;
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
            expect(parser.parse(method)).toEqual(['"first"', '#1', '"third"']);
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
