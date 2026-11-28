import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import { createContext } from '../../evaluate';
import { strtolowerExpression } from './StrtolowerExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const context = createContext({});

describe('StrtolowerExpression', () => {
    const expression = strtolowerExpression;

    describe('supports', () => {
        it('should support strtolower function call', () => {
            expect(expression.supports(callNode('strtolower'))).toBe(true);
        });

        it('should not support other function calls', () => {
            expect(expression.supports(callNode('strtoupper'))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should convert to lowercase', () => {
            const node = callNode('strtolower', [stringNode('HELLO')]);
            expect(expression.resolve(node, context)).toBe('hello');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('strtolower', [{ kind: 'variable', name: 'x' } as AstNode]);
            expect(
                expression.resolve(node, {
                    bindings: {},
                    resolve: () => undefined,
                    fork: () => context,
                }),
            ).toBeUndefined();
        });
    });
});
