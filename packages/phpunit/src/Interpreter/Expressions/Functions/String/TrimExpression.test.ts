import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import { createContext } from '../../evaluate';
import { trimExpression } from './TrimExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const context = createContext({});

describe('TrimExpression', () => {
    const expression = trimExpression;

    describe('supports', () => {
        it('should support trim function call', () => {
            expect(expression.supports(callNode('trim'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should trim whitespace', () => {
            const node = callNode('trim', [stringNode('  hello  ')]);
            expect(expression.resolve(node, context)).toBe('hello');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('trim', [{ kind: 'variable', name: 'x' } as AstNode]);
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
