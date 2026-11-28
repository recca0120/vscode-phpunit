import { describe, expect, it } from 'vitest';
import type {
    ArrayCreationNode,
    ArrayEntryNode,
    AstNode,
    CallNode,
    StringNode,
} from '../../../AstParser/AstNode';
import { createContext } from '../../evaluate';
import { implodeExpression } from './ImplodeExpression';

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function stringEntry(value: string): ArrayEntryNode {
    return { value: { kind: 'string', value } as StringNode } as ArrayEntryNode;
}

function arrayNode(entries: ArrayEntryNode[]): AstNode {
    return { kind: 'array_creation_expression', entries } as ArrayCreationNode;
}

function callNode(name: string, args: AstNode[] = []): CallNode {
    return { kind: 'function_call_expression', name, arguments: args } as CallNode;
}

const context = createContext({});

describe('ImplodeExpression', () => {
    const expression = implodeExpression;

    describe('supports', () => {
        it('should support implode function call', () => {
            expect(expression.supports(callNode('implode'))).toBe(true);
        });

        it('should support join function call', () => {
            expect(expression.supports(callNode('join'))).toBe(true);
        });

        it('should not support other function calls', () => {
            expect(expression.supports(callNode('explode'))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should join array elements with separator', () => {
            const node = callNode('implode', [
                stringNode(', '),
                arrayNode([stringEntry('a'), stringEntry('b'), stringEntry('c')]),
            ]);
            expect(expression.resolve(node, context)).toBe('a, b, c');
        });

        it('should return undefined when array argument is not array_creation_expression', () => {
            const node = callNode('implode', [
                stringNode(', '),
                { kind: 'variable', name: 'x' } as AstNode,
            ]);
            expect(expression.resolve(node, context)).toBeUndefined();
        });
    });
});
