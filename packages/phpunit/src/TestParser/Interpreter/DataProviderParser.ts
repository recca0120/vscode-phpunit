import type { AstNode } from '../AstParser/AstNode';
import { evaluateMethodBody, extractLabels } from './evaluate';

/**
 * Parses data provider sources to extract dataset labels.
 * Accepts a MethodNode (provider method body) or an array node (inline dataset).
 * Returns empty array for unresolvable patterns (e.g. array_map, loops).
 */
class DataProviderParser {
    parse(node: AstNode, classBody?: AstNode[]): string[] {
        if (node.kind === 'array_creation_expression') {
            return extractLabels(node.entries);
        }

        if (node.kind === 'method_declaration') {
            return evaluateMethodBody(node.body, classBody);
        }

        if (node.kind === 'anonymous_function' || node.kind === 'arrow_function') {
            const { body } = node;
            if (!body || body.kind !== 'compound_statement') {
                return [];
            }
            return evaluateMethodBody(body.children, classBody);
        }

        return [];
    }
}

export const dataProviderParser = new DataProviderParser();
