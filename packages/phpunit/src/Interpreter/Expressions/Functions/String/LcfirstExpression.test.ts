import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { lcfirstExpression } from './LcfirstExpression';

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

describe('LcfirstExpression', () => {
    const expression = lcfirstExpression;

    describe('supports', () => {
        it('should support lcfirst function call', () => {
            expect(expression.supports(callNode('lcfirst'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should lowercase first character', () => {
            const node = callNode('lcfirst', [stringNode('Hello')]);
            expect(expression.resolve(node, resolver)).toBe('hello');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('lcfirst', [{ kind: 'variable', name: 'x' } as AstNode]);
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
