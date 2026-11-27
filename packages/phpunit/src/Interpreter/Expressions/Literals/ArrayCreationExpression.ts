import type { ArrayCreationNode, AstNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class ArrayCreationExpression implements Expression<Map<string, unknown>> {
    supports(node: AstNode): boolean {
        return node.kind === 'array_creation_expression';
    }

    resolve(node: AstNode, context: Context): Map<string, unknown> | undefined {
        const entries = (node as ArrayCreationNode).entries;
        let numericIndex = 0;
        const result = new Map<string, unknown>();
        for (const entry of entries) {
            const key = entry.key ? context.resolve(entry.key) : undefined;
            if (entry.key && key === undefined) {
                return undefined;
            }
            const keyStr = key !== undefined ? castKey(key) : String(numericIndex++);
            const value = entry.value ? context.resolve(entry.value) : undefined;
            result.set(keyStr, value);
        }
        return result;
    }
}

function castKey(key: unknown): string {
    if (key === null) {
        return '';
    }
    if (typeof key === 'boolean') {
        return key ? '1' : '0';
    }
    return String(key);
}

export const arrayCreationExpression = new ArrayCreationExpression();
