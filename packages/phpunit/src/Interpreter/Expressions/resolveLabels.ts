import type { AstNode } from '../AstParser/AstNode';
import { toLabels } from './datasetLabels';
import { evaluate } from './evaluate';

export function resolveLabels(
    nodes: AstNode | AstNode[],
    classBody?: AstNode[],
    className?: string,
): string[] {
    const counter = { index: 0 };
    return [nodes].flat().flatMap((node) => {
        const resolved = evaluate(node, {}, classBody, className);
        if (resolved instanceof Map) {
            return toLabels(resolved, counter);
        }
        return Array.isArray(resolved) ? (resolved as string[]) : [];
    });
}
