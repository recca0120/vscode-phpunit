import { describe, expect, it } from 'vitest';
import type { AstNode, NumberNode } from '../../AstParser/AstNode';
import type { Context } from '../Expression';
import { numberLiteralExpression } from './NumberLiteralExpression';

const noopContext: Context = {
    bindings: {},
    resolve() {
        return undefined;
    },
    fork: () => noopContext,
};

describe('NumberLiteralExpression', () => {
    describe('supports', () => {
        it('should support number nodes', () => {
            expect(
                numberLiteralExpression.supports({ kind: 'number', value: 42 } as NumberNode),
            ).toBe(true);
        });

        it('should not support other nodes', () => {
            expect(numberLiteralExpression.supports({ kind: 'string' } as AstNode)).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should return number value', () => {
            const node = { kind: 'number', value: 42 } as NumberNode;
            expect(numberLiteralExpression.resolve(node, noopContext)).toBe(42);
        });

        it('should return zero', () => {
            const node = { kind: 'number', value: 0 } as NumberNode;
            expect(numberLiteralExpression.resolve(node, noopContext)).toBe(0);
        });

        it('should return negative number', () => {
            const node = { kind: 'number', value: -3 } as NumberNode;
            expect(numberLiteralExpression.resolve(node, noopContext)).toBe(-3);
        });
    });
});
