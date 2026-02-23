import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, NumberNode, StringNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { substrExpression } from './SubstrExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const resolver: Context = {
    bindings: {},
    resolve(node: AstNode) {
        if (node.kind === 'number') return String((node as NumberNode).value);
        if (node.kind === 'string') return (node as StringNode).value;
        return undefined;
    },
    fork: () => resolver,
};

describe('SubstrExpression', () => {
    const expression = substrExpression;

    describe('supports', () => {
        it('should support substr function call', () => {
            expect(expression.supports(callNode('substr'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should extract substring with start only', () => {
            const node = callNode('substr', [stringNode('hello'), numberNode(2)]);
            expect(expression.resolve(node, resolver)).toBe('llo');
        });

        it('should extract substring with start and length', () => {
            const node = callNode('substr', [stringNode('hello'), numberNode(1), numberNode(3)]);
            expect(expression.resolve(node, resolver)).toBe('ell');
        });

        it('should return undefined when string is undefined', () => {
            const node = callNode('substr', [
                { kind: 'variable', name: 'x' } as AstNode,
                numberNode(0),
            ]);
            expect(
                expression.resolve(node, {
                    bindings: {},
                    resolve: () => undefined,
                    fork: () => resolver,
                }),
            ).toBeUndefined();
        });
    });
});
