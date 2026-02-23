import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import type { Context } from '../../Expression';
import { strReplaceExpression } from './StrReplaceExpression';

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

describe('StrReplaceExpression', () => {
    const expression = strReplaceExpression;

    describe('supports', () => {
        it('should support str_replace function call', () => {
            expect(expression.supports(callNode('str_replace'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should replace occurrences', () => {
            const node = callNode('str_replace', [
                stringNode('world'),
                stringNode('PHP'),
                stringNode('hello world'),
            ]);
            expect(expression.resolve(node, resolver)).toBe('hello PHP');
        });

        it('should return undefined when any argument is undefined', () => {
            const node = callNode('str_replace', [
                stringNode('a'),
                { kind: 'variable', name: 'x' } as AstNode,
                stringNode('abc'),
            ]);
            expect(expression.resolve(node, resolver)).toBeUndefined();
        });
    });
});
