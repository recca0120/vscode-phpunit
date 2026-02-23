import { describe, expect, it } from 'vitest';
import type {
    AstNode,
    BinaryOpNode,
    ConditionalExpressionNode,
    NumberNode,
    StringNode,
} from '../../AstParser/AstNode';
import type { Context } from '../Expression';
import { conditionalExpression } from './ConditionalExpression';

function numberNode(value: number): AstNode {
    return { kind: 'number', value } as NumberNode;
}

function stringNode(value: string): AstNode {
    return { kind: 'string', value } as StringNode;
}

function condNode(condition: AstNode, consequent: AstNode, alternate: AstNode): AstNode {
    return {
        kind: 'conditional_expression',
        condition,
        consequent,
        alternate,
    } as ConditionalExpressionNode;
}

function binaryNode(left: AstNode, operator: string, right: AstNode): AstNode {
    return { kind: 'binary_expression', left, operator, right } as BinaryOpNode;
}

const resolver: Context = {
    bindings: {},
    resolve(node: AstNode) {
        if (node.kind === 'number') return String((node as NumberNode).value);
        if (node.kind === 'string') return (node as StringNode).value;
        if (node.kind === 'binary_expression') {
            const bin = node as BinaryOpNode;
            const l = resolver.resolve(bin.left);
            const r = resolver.resolve(bin.right);
            if (l === undefined || r === undefined) return undefined;
            if (bin.operator === '<') return String(Number(l) < Number(r));
            if (bin.operator === '===') return String(l === r);
            return undefined;
        }
        return undefined;
    },
    fork: () => resolver,
};

describe('ConditionalExpression', () => {
    describe('supports', () => {
        it('should support conditional_expression nodes', () => {
            expect(
                conditionalExpression.supports(
                    condNode(numberNode(1), numberNode(2), numberNode(3)),
                ),
            ).toBe(true);
        });

        it('should not support other nodes', () => {
            expect(conditionalExpression.supports(numberNode(1))).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should return consequent when condition is true', () => {
            const node = condNode(
                binaryNode(numberNode(1), '<', numberNode(3)),
                stringNode('yes'),
                stringNode('no'),
            );
            expect(conditionalExpression.resolve(node, resolver)).toBe('yes');
        });

        it('should return alternate when condition is false', () => {
            const node = condNode(
                binaryNode(numberNode(5), '<', numberNode(3)),
                stringNode('yes'),
                stringNode('no'),
            );
            expect(conditionalExpression.resolve(node, resolver)).toBe('no');
        });

        it('should return undefined when condition cannot be resolved', () => {
            const node = condNode(
                { kind: 'unknown' } as unknown as AstNode,
                stringNode('yes'),
                stringNode('no'),
            );
            expect(conditionalExpression.resolve(node, resolver)).toBeUndefined();
        });
    });
});
