import { describe, expect, it } from 'vitest';
import type { AssignmentNode, AstNode, NumberNode, StringNode } from '../../AstParser/AstNode';
import type { Bindings, Context } from '../Expression';
import { assignmentExpression } from './AssignmentExpression';

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function assignmentNode(variable: string, value: AstNode, operator?: string): AstNode {
    return { kind: 'assignment_expression', variable, value, operator } as AssignmentNode;
}

function makeContext(bindings: Bindings = {}): Context {
    return {
        bindings,
        resolve(node: AstNode) {
            if (node.kind === 'number') return (node as NumberNode).value;
            if (node.kind === 'string') return (node as StringNode).value;
            return undefined;
        },
        fork: () => makeContext(bindings),
    };
}

describe('AssignmentExpression', () => {
    describe('supports', () => {
        it('should support assignment_expression', () => {
            expect(assignmentExpression.supports(assignmentNode('x', numberNode(5)))).toBe(true);
        });

        it('should not support other node kinds', () => {
            expect(assignmentExpression.supports(numberNode(1))).toBe(false);
        });
    });

    describe('resolve — simple assignment', () => {
        it('should resolve $x = 5', () => {
            const node = assignmentNode('x', numberNode(5));
            expect(assignmentExpression.resolve(node, makeContext())).toBe(5);
        });

        it('should resolve $x = "hello"', () => {
            const node = assignmentNode('x', stringNode('hello'));
            expect(assignmentExpression.resolve(node, makeContext())).toBe('hello');
        });

        it('should return undefined when value cannot be resolved', () => {
            const unknown = { kind: 'unknown' } as unknown as AstNode;
            const node = assignmentNode('x', unknown);
            expect(assignmentExpression.resolve(node, makeContext())).toBeUndefined();
        });
    });

    describe('resolve — compound assignment', () => {
        it('should resolve $x += 2 when $x is 3', () => {
            const node = assignmentNode('x', numberNode(2), '+=');
            const bindings: Bindings = { x: 3 };
            expect(assignmentExpression.resolve(node, makeContext(bindings))).toBe(5);
        });

        it('should resolve $x -= 1 when $x is 10', () => {
            const node = assignmentNode('x', numberNode(1), '-=');
            const bindings: Bindings = { x: 10 };
            expect(assignmentExpression.resolve(node, makeContext(bindings))).toBe(9);
        });

        it('should resolve $x *= 3 when $x is 4', () => {
            const node = assignmentNode('x', numberNode(3), '*=');
            const bindings: Bindings = { x: 4 };
            expect(assignmentExpression.resolve(node, makeContext(bindings))).toBe(12);
        });

        it('should resolve $x %= 3 when $x is 10', () => {
            const node = assignmentNode('x', numberNode(3), '%=');
            const bindings: Bindings = { x: 10 };
            expect(assignmentExpression.resolve(node, makeContext(bindings))).toBe(1);
        });

        it('should return undefined when step cannot be resolved', () => {
            const unknown = { kind: 'unknown' } as unknown as AstNode;
            const node = assignmentNode('x', unknown, '+=');
            const bindings: Bindings = { x: 3 };
            expect(assignmentExpression.resolve(node, makeContext(bindings))).toBeUndefined();
        });
    });
});
