import { describe, expect, it } from 'vitest';
import type { AstNode, NumberNode, UpdateExpressionNode } from '../../AstParser/AstNode';
import type { Bindings, Context } from '../Expression';
import { updateExpression } from './UpdateExpression';

function updateNode(variable: string, operator: string): AstNode {
    return { kind: 'update_expression', variable, operator } as UpdateExpressionNode;
}

function makeContext(bindings: Bindings = {}): Context {
    return {
        bindings,
        resolve() {
            return undefined;
        },
        fork: () => makeContext(bindings),
    };
}

describe('UpdateExpression', () => {
    describe('supports', () => {
        it('should support update_expression', () => {
            expect(updateExpression.supports(updateNode('i', '++'))).toBe(true);
        });

        it('should not support other node kinds', () => {
            expect(updateExpression.supports({ kind: 'number', value: 1 } as NumberNode)).toBe(
                false,
            );
        });
    });

    describe('resolve', () => {
        it('should resolve $i++ when $i is 3', () => {
            const node = updateNode('i', '++');
            const bindings: Bindings = { i: 3 };
            expect(updateExpression.resolve(node, makeContext(bindings))).toBe(4);
        });

        it('should resolve $i-- when $i is 5', () => {
            const node = updateNode('i', '--');
            const bindings: Bindings = { i: 5 };
            expect(updateExpression.resolve(node, makeContext(bindings))).toBe(4);
        });

        it('should resolve $i++ when $i is 0', () => {
            const node = updateNode('i', '++');
            const bindings: Bindings = { i: 0 };
            expect(updateExpression.resolve(node, makeContext(bindings))).toBe(1);
        });

        it('should return undefined when variable is not in bindings', () => {
            const node = updateNode('i', '++');
            expect(updateExpression.resolve(node, makeContext())).toBeUndefined();
        });
    });
});
