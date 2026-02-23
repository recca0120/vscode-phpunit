import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { strtoupperExpression } from './StrtoupperExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const resolver: Context = {
    bindings: {},
    resolve(node: AstNode) {
        if (node.kind === 'string') return (node as StringNode).value;
        return undefined;
    },
    fork: () => resolver,
};

describe('StrtoupperExpression', () => {
    const expression = strtoupperExpression;

    describe('supports', () => {
        it('should support strtoupper function call', () => {
            expect(expression.supports(callNode('strtoupper'))).toBe(true);
        });

        it('should not support other function calls', () => {
            expect(expression.supports(callNode('strtolower'))).toBe(false);
        });

        it('should not support non-call nodes', () => {
            expect(expression.supports(stringNode('a'))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should convert to uppercase', () => {
            const node = callNode('strtoupper', [stringNode('hello')]);
            expect(expression.resolve(node, resolver)).toBe('HELLO');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('strtoupper', [{ kind: 'variable', name: 'x' } as AstNode]);
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
