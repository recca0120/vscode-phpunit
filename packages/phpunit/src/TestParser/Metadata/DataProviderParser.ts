import type {
    ArrayCreationNode,
    ArrayEntryNode,
    AstNode,
    MethodNode,
    ReturnStatementNode,
    YieldExpressionNode,
} from '../AstParser/AstNode';

/**
 * Parses data provider sources to extract dataset labels.
 * Accepts a MethodNode (provider method body) or an array node (inline dataset).
 * Returns empty array for unresolvable patterns (e.g. array_map, loops).
 */
class DataProviderParser {
    parse(node: AstNode): string[] {
        if (node.kind === 'array_creation_expression') {
            return this.extractLabels((node as ArrayCreationNode).entries);
        }

        if (node.kind === 'method_declaration') {
            return this.parseMethodBody((node as MethodNode).body);
        }

        return [];
    }

    private parseMethodBody(body: AstNode[] | undefined): string[] {
        if (!body) {
            return [];
        }

        const returns = body.filter((s): s is ReturnStatementNode => s.kind === 'return_statement');
        const yields = body.filter((s): s is YieldExpressionNode => s.kind === 'yield_expression');

        if (returns.length === 1 && returns[0].value?.kind === 'array_creation_expression') {
            return this.extractLabels((returns[0].value as ArrayCreationNode).entries);
        }

        if (yields.length > 0) {
            return this.extractLabels(yields);
        }

        return [];
    }

    private extractLabels(entries: (ArrayEntryNode | YieldExpressionNode)[]): string[] {
        let numericIndex = 0;
        return entries.map((entry) => {
            if (entry.key?.kind === 'string' && entry.key.value) {
                return `"${entry.key.value}"`;
            }
            return `#${numericIndex++}`;
        });
    }
}

export const dataProviderParser = new DataProviderParser();
