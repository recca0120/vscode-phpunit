import { describe, expect, it } from 'vitest';
import type { AstNode, VariableNode } from '../../AstParser/AstNode';
import type { Bindings, Context } from '../Expression';
import { variableExpression } from './VariableExpression';

function makeContext(bindings: Bindings = {}): Context {
    return {
        bindings,
        resolve() {
            return undefined;
        },
        fork: () => makeContext(bindings),
    };
}

describe('VariableExpression', () => {
    describe('supports', () => {
        it('should support variable nodes', () => {
            expect(
                variableExpression.supports({ kind: 'variable', name: 'x' } as VariableNode),
            ).toBe(true);
        });

        it('should not support other nodes', () => {
            expect(variableExpression.supports({ kind: 'string' } as AstNode)).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should resolve variable bound to string', () => {
            const bindings: Bindings = { x: 'hello' };
            const node = { kind: 'variable', name: 'x' } as VariableNode;
            expect(variableExpression.resolve(node, makeContext(bindings))).toBe('hello');
        });

        it('should resolve variable bound to number', () => {
            const bindings: Bindings = { x: 42 };
            const node = { kind: 'variable', name: 'x' } as VariableNode;
            expect(variableExpression.resolve(node, makeContext(bindings))).toBe(42);
        });

        it('should return undefined for unbound variable', () => {
            const node = { kind: 'variable', name: 'x' } as VariableNode;
            expect(variableExpression.resolve(node, makeContext())).toBeUndefined();
        });
    });
});
