import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, NumberNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { rangeExpression } from './RangeExpression';

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const resolver: Context = {
    bindings: {},
    resolve(node: AstNode) {
        if (node.kind === 'number') return (node as NumberNode).value;
        return undefined;
    },
    fork: () => resolver,
};

describe('RangeExpression', () => {
    const expression = rangeExpression;

    describe('supports', () => {
        it('should support range function call', () => {
            expect(expression.supports(callNode('range'))).toBe(true);
        });

        it('should not support other function calls', () => {
            expect(expression.supports(callNode('array_map'))).toBe(false);
        });

        it('should not support non-call nodes', () => {
            expect(expression.supports(numberNode(1))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should generate ascending range', () => {
            const node = callNode('range', [numberNode(1), numberNode(3)]);
            expect(expression.resolve(node, resolver)).toEqual(
                new Map([
                    ['0', 1],
                    ['1', 2],
                    ['2', 3],
                ]),
            );
        });

        it('should generate descending range', () => {
            const node = callNode('range', [numberNode(3), numberNode(1)]);
            expect(expression.resolve(node, resolver)).toEqual(
                new Map([
                    ['0', 3],
                    ['1', 2],
                    ['2', 1],
                ]),
            );
        });

        it('should generate range with custom step', () => {
            const node = callNode('range', [numberNode(0), numberNode(6), numberNode(2)]);
            expect(expression.resolve(node, resolver)).toEqual(
                new Map([
                    ['0', 0],
                    ['1', 2],
                    ['2', 4],
                    ['3', 6],
                ]),
            );
        });

        it('should return undefined with less than 2 args', () => {
            const node = callNode('range', [numberNode(1)]);
            expect(expression.resolve(node, resolver)).toBeUndefined();
        });

        it('should return undefined when step is 0', () => {
            const node = callNode('range', [numberNode(1), numberNode(3), numberNode(0)]);
            expect(expression.resolve(node, resolver)).toBeUndefined();
        });
    });
});
