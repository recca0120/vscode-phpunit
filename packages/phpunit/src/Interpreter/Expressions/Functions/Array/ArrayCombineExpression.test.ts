import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { arrayCombineExpression } from './ArrayCombineExpression';

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

function makeContext(resolveFn: (node: AstNode) => unknown): Context {
    return {
        bindings: {},
        resolve: resolveFn,
        fork: () => makeContext(resolveFn),
    };
}

describe('ArrayCombineExpression', () => {
    const expression = arrayCombineExpression;

    const mockContext = makeContext((node: AstNode) => {
        if (node.kind === 'array_creation_expression') {
            return new Map([
                ['0', 'a'],
                ['1', 'b'],
                ['2', 'c'],
            ]);
        }
        return undefined;
    });

    describe('supports', () => {
        it('should support array_combine function call', () => {
            expect(expression.supports(callNode('array_combine'))).toBe(true);
        });

        it('should not support other function calls', () => {
            expect(expression.supports(callNode('array_map'))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should return string labels for string keys', () => {
            const node = callNode('array_combine', [
                { kind: 'array_creation_expression', entries: [] } as AstNode,
                { kind: 'array_creation_expression', entries: [] } as AstNode,
            ]);
            expect(expression.resolve(node, mockContext)).toEqual([
                'data set "a"',
                'data set "b"',
                'data set "c"',
            ]);
        });

        it('should return indexed labels for non-string keys', () => {
            const numericContext = makeContext(
                () =>
                    new Map([
                        ['0', 1],
                        ['1', 2],
                        ['2', 3],
                    ]),
            );
            const node = callNode('array_combine', [
                { kind: 'array_creation_expression', entries: [] } as AstNode,
                { kind: 'array_creation_expression', entries: [] } as AstNode,
            ]);
            expect(expression.resolve(node, numericContext)).toEqual([
                'data set #0',
                'data set #1',
                'data set #2',
            ]);
        });

        it('should return undefined with less than 2 args', () => {
            const node = callNode('array_combine', [{ kind: 'string' } as AstNode]);
            expect(expression.resolve(node, mockContext)).toBeUndefined();
        });
    });
});
