import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import { createContext } from '../../evaluate';
import { ucfirstExpression } from './UcfirstExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const context = createContext({});

describe('UcfirstExpression', () => {
    const expression = ucfirstExpression;

    describe('supports', () => {
        it('should support ucfirst function call', () => {
            expect(expression.supports(callNode('ucfirst'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should capitalize first character', () => {
            const node = callNode('ucfirst', [stringNode('hello')]);
            expect(expression.resolve(node, context)).toBe('Hello');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('ucfirst', [{ kind: 'variable', name: 'x' } as AstNode]);
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
