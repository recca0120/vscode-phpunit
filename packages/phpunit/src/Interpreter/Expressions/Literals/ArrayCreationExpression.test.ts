import { describe, expect, it } from 'vitest';
import type {
    ArrayCreationNode,
    ArrayEntryNode,
    AstNode,
    NumberNode,
    StringNode,
} from '../../AstParser/AstNode';
import type { Context } from '../Expression';
import { arrayCreationExpression } from './ArrayCreationExpression';

function stringEntry(value: string): ArrayEntryNode {
    return { value: { kind: 'string', value } as StringNode } as ArrayEntryNode;
}

function numberEntry(value: number): ArrayEntryNode {
    return { value: { kind: 'number', value } as NumberNode } as ArrayEntryNode;
}

function arrayNode(entries: ArrayEntryNode[]): AstNode {
    return { kind: 'array_creation_expression', entries } as ArrayCreationNode;
}

const noopContext: Context = {
    bindings: {},
    resolve(node: AstNode) {
        if (node.kind === 'string') return (node as StringNode).value;
        if (node.kind === 'number') return (node as NumberNode).value;
        return undefined;
    },
    fork: () => noopContext,
};

describe('ArrayCreationExpression', () => {
    const expression = arrayCreationExpression;

    describe('supports', () => {
        it('should support array_creation_expression', () => {
            expect(expression.supports(arrayNode([]))).toBe(true);
        });

        it('should not support other nodes', () => {
            expect(expression.supports({ kind: 'number' } as AstNode)).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should resolve string entries', () => {
            const node = arrayNode([stringEntry('a'), stringEntry('b')]);
            expect(expression.resolve(node, noopContext)).toEqual(
                new Map([
                    ['0', 'a'],
                    ['1', 'b'],
                ]),
            );
        });

        it('should resolve number entries', () => {
            const node = arrayNode([numberEntry(1), numberEntry(2)]);
            expect(expression.resolve(node, noopContext)).toEqual(
                new Map([
                    ['0', 1],
                    ['1', 2],
                ]),
            );
        });

        it('should resolve mixed entries', () => {
            const node = arrayNode([stringEntry('a'), numberEntry(1)]);
            expect(expression.resolve(node, noopContext)).toEqual(
                new Map<string, unknown>([
                    ['0', 'a'],
                    ['1', 1],
                ]),
            );
        });

        it('should return undefined for unknown entry kinds', () => {
            const node = arrayNode([{ value: { kind: 'variable' } } as ArrayEntryNode]);
            expect(expression.resolve(node, noopContext)).toEqual(
                new Map<string, unknown>([['0', undefined]]),
            );
        });

        it('should resolve empty array', () => {
            expect(expression.resolve(arrayNode([]), noopContext)).toEqual(new Map());
        });

        it('should resolve keyed entries', () => {
            const node = arrayNode([
                {
                    key: { kind: 'string', value: 'foo' } as StringNode,
                    value: { kind: 'number', value: 1 } as NumberNode,
                } as ArrayEntryNode,
            ]);
            expect(expression.resolve(node, noopContext)).toEqual(new Map([['foo', 1]]));
        });
    });
});
