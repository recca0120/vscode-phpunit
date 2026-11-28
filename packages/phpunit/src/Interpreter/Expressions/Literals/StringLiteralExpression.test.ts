import { describe, expect, it } from 'vitest';
import type { AstNode, StringNode } from '../../AstParser/AstNode';
import { createContext } from '../evaluate';
import { stringLiteralExpression } from './StringLiteralExpression';

const context = createContext({});

describe('StringLiteralExpression', () => {
    describe('supports', () => {
        it('should support string nodes', () => {
            expect(
                stringLiteralExpression.supports({ kind: 'string', value: 'hello' } as StringNode),
            ).toBe(true);
        });

        it('should not support other nodes', () => {
            expect(stringLiteralExpression.supports({ kind: 'number' } as AstNode)).toBe(false);
        });
    });

    describe('resolve', () => {
        it('should return the string value', () => {
            const node = { kind: 'string', value: 'hello' } as StringNode;
            expect(stringLiteralExpression.resolve(node, context)).toBe('hello');
        });

        it('should return empty string', () => {
            const node = { kind: 'string', value: '' } as StringNode;
            expect(stringLiteralExpression.resolve(node, context)).toBe('');
        });
    });
});
