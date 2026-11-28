import { describe, expect, it } from 'vitest';
import type { AstNode, NumberNode, ReturnStatementNode, StringNode } from '../../AstParser/AstNode';
import { createContext } from '../evaluate';
import { returnExpression } from './ReturnExpression';

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function returnNode(value?: AstNode): AstNode {
    return { kind: 'return_statement', value } as ReturnStatementNode;
}

const makeContext = () => createContext({});

describe('ReturnExpression', () => {
    describe('supports', () => {
        it('should support return_statement', () => {
            expect(returnExpression.supports(returnNode(numberNode(5)))).toBe(true);
        });

        it('should not support other node kinds', () => {
            expect(returnExpression.supports(numberNode(1))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should resolve return 5 to 5', () => {
            const node = returnNode(numberNode(5));
            expect(returnExpression.resolve(node, makeContext())).toBe(5);
        });

        it('should resolve return "hello" to "hello"', () => {
            const node = returnNode(stringNode('hello'));
            expect(returnExpression.resolve(node, makeContext())).toBe('hello');
        });

        it('should return undefined when no value', () => {
            const node = returnNode();
            expect(returnExpression.resolve(node, makeContext())).toBeUndefined();
        });

        it('should return undefined when value cannot be resolved', () => {
            const node = returnNode({ kind: 'unknown' } as unknown as AstNode);
            expect(returnExpression.resolve(node, makeContext())).toBeUndefined();
        });
    });
});
