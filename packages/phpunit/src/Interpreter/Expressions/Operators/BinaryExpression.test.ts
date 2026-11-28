import { describe, expect, it } from 'vitest';
import type { AstNode, BinaryOpNode, NumberNode, StringNode } from '../../AstParser/AstNode';
import { createContext } from '../evaluate';
import { binaryExpr, compare } from './BinaryExpression';

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function binaryNode(left: AstNode, operator: string, right: AstNode): AstNode {
    return { kind: 'binary_expression', left, operator, right } as BinaryOpNode;
}

const context = createContext({});

describe('binaryExpr', () => {
    describe('supports', () => {
        it.each(['.', '+', '-', '*', '%', '<', '<=', '>', '>=', '==', '===', '!=', '!=='])(
            'should support %s',
            (op) => {
                expect(binaryExpr.supports(binaryNode(numberNode(1), op, numberNode(2)))).toBe(
                    true,
                );
            },
        );

        it('should not support non-binary nodes', () => {
            expect(binaryExpr.supports(numberNode(1))).toBe(false);
        });

        it('should not support unknown operators', () => {
            expect(binaryExpr.supports(binaryNode(numberNode(1), '??', numberNode(2)))).toBe(false);
        });
    });

    describe('resolve — concat', () => {
        it('should resolve "a" . "b" to "ab"', () => {
            const node = binaryNode(stringNode('a'), '.', stringNode('b'));
            expect(binaryExpr.resolve(node, context)).toBe('ab');
        });
    });

    describe('resolve — arithmetic', () => {
        it('should resolve 1 + 2 to 3', () => {
            const node = binaryNode(numberNode(1), '+', numberNode(2));
            expect(binaryExpr.resolve(node, context)).toBe(3);
        });

        it('should resolve 5 - 3 to 2', () => {
            const node = binaryNode(numberNode(5), '-', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(2);
        });

        it('should resolve 4 * 3 to 12', () => {
            const node = binaryNode(numberNode(4), '*', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(12);
        });

        it('should resolve 10 % 3 to 1', () => {
            const node = binaryNode(numberNode(10), '%', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(1);
        });

        it('should return undefined when left is not a number', () => {
            const str = { kind: 'string', value: 'abc' } as unknown as AstNode;
            const node = binaryNode(str, '+', numberNode(1));
            expect(binaryExpr.resolve(node, context)).toBeUndefined();
        });
    });

    describe('resolve — comparison', () => {
        it('should resolve 1 < 3 to true', () => {
            const node = binaryNode(numberNode(1), '<', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(true);
        });

        it('should resolve 3 < 1 to false', () => {
            const node = binaryNode(numberNode(3), '<', numberNode(1));
            expect(binaryExpr.resolve(node, context)).toBe(false);
        });

        it('should resolve 3 <= 3 to true', () => {
            const node = binaryNode(numberNode(3), '<=', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(true);
        });

        it('should resolve 5 > 3 to true', () => {
            const node = binaryNode(numberNode(5), '>', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(true);
        });

        it('should resolve 3 >= 3 to true', () => {
            const node = binaryNode(numberNode(3), '>=', numberNode(3));
            expect(binaryExpr.resolve(node, context)).toBe(true);
        });
    });

    describe('resolve — equality', () => {
        it('should resolve equal strings with === to true', () => {
            const node = binaryNode(stringNode('a'), '===', stringNode('a'));
            expect(binaryExpr.resolve(node, context)).toBe(true);
        });

        it('should resolve different strings with === to false', () => {
            const node = binaryNode(stringNode('a'), '===', stringNode('b'));
            expect(binaryExpr.resolve(node, context)).toBe(false);
        });

        it('should resolve !== for different strings to true', () => {
            const node = binaryNode(stringNode('a'), '!==', stringNode('b'));
            expect(binaryExpr.resolve(node, context)).toBe(true);
        });
    });

    describe('resolve — undefined', () => {
        it('should return undefined when left cannot be resolved', () => {
            const unknown = { kind: 'unknown' } as unknown as AstNode;
            const node = binaryNode(unknown, '<', numberNode(1));
            expect(binaryExpr.resolve(node, context)).toBeUndefined();
        });

        it('should return undefined when right cannot be resolved', () => {
            const unknown = { kind: 'unknown' } as unknown as AstNode;
            const node = binaryNode(numberNode(1), '<', unknown);
            expect(binaryExpr.resolve(node, context)).toBeUndefined();
        });
    });
});

describe('compare', () => {
    it('should compare AST node: 1 < 3', () => {
        const node = binaryNode(numberNode(1), '<', numberNode(3));
        expect(compare(node, context)).toBe(true);
    });

    it('should compare AST node: "a" === "a"', () => {
        const node = binaryNode(stringNode('a'), '===', stringNode('a'));
        expect(compare(node, context)).toBe(true);
    });

    it('should compare AST node: 3 == 3', () => {
        const node = binaryNode(numberNode(3), '==', numberNode(3));
        expect(compare(node, context)).toBe(true);
    });
});
