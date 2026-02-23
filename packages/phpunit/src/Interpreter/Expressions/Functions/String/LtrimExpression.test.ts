import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { ltrimExpression } from './LtrimExpression';

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

describe('LtrimExpression', () => {
    const expression = ltrimExpression;

    describe('supports', () => {
        it('should support ltrim function call', () => {
            expect(expression.supports(callNode('ltrim'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should trim left whitespace', () => {
            const node = callNode('ltrim', [stringNode('  hello  ')]);
            expect(expression.resolve(node, resolver)).toBe('hello  ');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('ltrim', [{ kind: 'variable', name: 'x' } as AstNode]);
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
