import { describe, expect, it } from 'vitest';
import type { AstNode, CallNode, StringNode } from '../../../AstParser/AstNode';
import { createContext } from '../../evaluate';
import { rtrimExpression } from './RtrimExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const context = createContext({});

describe('RtrimExpression', () => {
    const expression = rtrimExpression;

    describe('supports', () => {
        it('should support rtrim function call', () => {
            expect(expression.supports(callNode('rtrim'))).toBe(true);
        });
    });

    describe('resolve', () => {
        it('should trim right whitespace', () => {
            const node = callNode('rtrim', [stringNode('  hello  ')]);
            expect(expression.resolve(node, context)).toBe('  hello');
        });

        it('should return undefined when argument is undefined', () => {
            const node = callNode('rtrim', [{ kind: 'variable', name: 'x' } as AstNode]);
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
