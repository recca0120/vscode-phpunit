import { describe, expect, it } from 'vitest';
import type {
    AstNode,
    EncapsedStringNode,
    StringNode,
    VariableNode,
} from '../../AstParser/AstNode';
import { createContext } from '../evaluate';
import { encapsedStringExpression } from './EncapsedStringExpression';

const makeContext = (bindings: Record<string, string> = {}) => createContext(bindings);

function encapsedNode(parts: AstNode[]): AstNode {
    return { kind: 'encapsed_string', parts } as EncapsedStringNode;
}

describe('EncapsedStringExpression', () => {
    describe('supports', () => {
        it('should support encapsed_string nodes', () => {
            expect(encapsedStringExpression.supports(encapsedNode([]))).toBe(true);
        });

        it('should not support other nodes', () => {
            expect(encapsedStringExpression.supports({ kind: 'string' } as AstNode)).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should interpolate string parts', () => {
            const node = encapsedNode([
                { kind: 'string', value: 'Hello ' } as StringNode,
                { kind: 'string', value: 'World' } as StringNode,
            ]);
            expect(encapsedStringExpression.resolve(node, makeContext())).toBe('Hello World');
        });

        it('should interpolate variables', () => {
            const node = encapsedNode([
                { kind: 'string', value: 'Hello ' } as StringNode,
                { kind: 'variable', name: 'name' } as VariableNode,
            ]);
            expect(encapsedStringExpression.resolve(node, makeContext({ name: 'Alice' }))).toBe(
                'Hello Alice',
            );
        });

        it('should keep $varName when variable is unresolved', () => {
            const node = encapsedNode([
                { kind: 'string', value: 'Hello ' } as StringNode,
                { kind: 'variable', name: 'name' } as VariableNode,
            ]);
            expect(encapsedStringExpression.resolve(node, makeContext())).toBe('Hello $name');
        });

        it('should return empty string for unknown part kinds', () => {
            const node = encapsedNode([
                { kind: 'string', value: 'a' } as StringNode,
                { kind: 'number', value: 1 } as AstNode,
                { kind: 'string', value: 'b' } as StringNode,
            ]);
            expect(encapsedStringExpression.resolve(node, makeContext())).toBe('ab');
        });
    });
});
