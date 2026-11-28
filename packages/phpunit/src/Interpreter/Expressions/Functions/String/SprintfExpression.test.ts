import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, NumberNode, StringNode } from '../../../AstParser/AstNode';
import { createContext } from '../../evaluate';
import { sprintfExpression } from './SprintfExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const context = createContext({});

describe('SprintfExpression', () => {
    const expression = sprintfExpression;

    describe('supports', () => {
        it('should support sprintf function call', () => {
            expect(expression.supports(callNode('sprintf'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should format string with %s', () => {
            const node = callNode('sprintf', [stringNode('hello %s'), stringNode('world')]);
            expect(expression.resolve(node, context)).toBe('hello world');
        });

        it('should format string with %d', () => {
            const node = callNode('sprintf', [stringNode('count: %d'), numberNode(42)]);
            expect(expression.resolve(node, context)).toBe('count: 42');
        });

        it('should return undefined when format is undefined', () => {
            const node = callNode('sprintf', [{ kind: 'variable', name: 'x' } as AstNode]);
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
