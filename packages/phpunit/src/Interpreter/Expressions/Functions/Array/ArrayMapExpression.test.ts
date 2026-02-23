import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { arrayMapExpression } from './ArrayMapExpression';

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

describe('ArrayMapExpression', () => {
    const expression = arrayMapExpression;

    const mockContext: Context = {
        bindings: {},
        resolve(node: AstNode) {
            if (node.kind === 'array_creation_expression') {
                return new Map([
                    ['0', 1],
                    ['1', 2],
                    ['2', 3],
                ]);
            }
            return undefined;
        },
        fork: () => mockContext,
    };

    describe('supports', () => {
        it('should support array_map function call', () => {
            expect(expression.supports(callNode('array_map'))).toBe(true);
        });

        it('should not support other function calls', () => {
            expect(expression.supports(callNode('array_filter'))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should return indexed labels', () => {
            const node = callNode('array_map', [
                { kind: 'string', value: 'intval' } as AstNode,
                { kind: 'array_creation_expression', entries: [] } as AstNode,
            ]);
            expect(expression.resolve(node, mockContext)).toEqual(['#0', '#1', '#2']);
        });

        it('should return undefined with less than 2 args', () => {
            const node = callNode('array_map', [{ kind: 'string' } as AstNode]);
            expect(expression.resolve(node, mockContext)).toBeUndefined();
        });
    });
});
