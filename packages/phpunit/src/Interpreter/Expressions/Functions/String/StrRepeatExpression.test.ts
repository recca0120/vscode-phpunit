import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, NumberNode, StringNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { strRepeatExpression } from './StrRepeatExpression';

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

describe('StrRepeatExpression', () => {
    const expression = strRepeatExpression;

    describe('supports', () => {
        it('should support str_repeat function call', () => {
            expect(expression.supports(callNode('str_repeat'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should repeat string', () => {
            const node = callNode('str_repeat', [stringNode('ab'), numberNode(3)]);
            expect(expression.resolve(node, resolver)).toBe('ababab');
        });

        it('should return undefined when string is undefined', () => {
            const node = callNode('str_repeat', [
                { kind: 'variable', name: 'x' } as AstNode,
                numberNode(3),
            ]);
            expect(
                expression.resolve(node, {
                    bindings: {},
                    resolve: () => undefined,
                    fork: () => resolver,
                }),
            ).toBeUndefined();
        });

        it('should return empty string for count 0', () => {
            const node = callNode('str_repeat', [stringNode('ab'), numberNode(0)]);
            expect(expression.resolve(node, resolver)).toBe('');
        });
    });
});
