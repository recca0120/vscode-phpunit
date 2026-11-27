import { beforeAll, describe, expect, it } from 'vitest';
import { parsers } from '../../../tests/support/parsers';
import type { AstNode, CallNode, ExpressionStatementNode } from '../AstParser/AstNode';
import { initTreeSitter } from '../AstParser/TreeSitter/TreeSitterParser';
import { resolveLabels } from './resolveLabels';

beforeAll(async () => initTreeSitter());

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

describe.each(parsers)(
    'resolveLabels on values shaped like Pest ->with() arguments (%s)',
    (_name, createParser) => {
        const givenPestArray = (code: string) => {
            const ast = createParser().parse(code, 'test.php');
            return findWithArrayArg(ast as AstNode);
        };

        describe('inline array (Pest ->with())', () => {
            it('array with named keys', () => {
                const arrayNode = givenPestArray(
                    `<?php it('test')->with(['alice' => [1], 'bob' => [2]]);`,
                );
                expect(resolveLabels(arrayNode)).toEqual(['data set "alice"', 'data set "bob"']);
            });

            it('array with numeric keys', () => {
                const arrayNode = givenPestArray(`<?php it('test')->with([[1, 2], [3, 4]]);`);
                expect(resolveLabels(arrayNode)).toEqual(['data set #0', 'data set #1']);
            });
        });

        describe('Pest ->with(fn() => ...) arrow function', () => {
            it('arrow function returning range()', () => {
                const node = givenPestArray(`<?php it('test')->with(fn() => range(1, 3));`);
                expect(resolveLabels(node)).toEqual(['data set #0', 'data set #1', 'data set #2']);
            });

            it('arrow function returning array literal', () => {
                const node = givenPestArray(`<?php it('test')->with(fn() => ['a', 'b']);`);
                expect(resolveLabels(node)).toEqual(['data set #0', 'data set #1']);
            });

            it('arrow function returning unresolvable expression', () => {
                const node = givenPestArray(`<?php it('test')->with(fn() => User::all());`);
                expect(resolveLabels(node)).toEqual([]);
            });
        });
    },
);
