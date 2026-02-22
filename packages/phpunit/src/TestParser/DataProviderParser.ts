import type {
    ArrayCreationNode,
    ArrayEntryNode,
    AstNode,
    MethodNode,
    ReturnStatementNode,
    StringNode,
    YieldExpressionNode,
} from './AstNode';

export type DatasetEntry = { label: string; value: string };

/**
 * Parses data provider sources to extract dataset labels.
 * Accepts a MethodNode (provider method body) or an array node (inline dataset).
 * Returns empty array for unresolvable patterns (e.g. array_map, loops).
 */
class DataProviderParser {
    parse(node: AstNode): string[] {
        return this.parseEntries(node).map((e) => e.label);
    }

    parseEntries(node: AstNode): DatasetEntry[] {
        if (node.kind === 'array_creation_expression') {
            return this.extractEntries((node as ArrayCreationNode).entries);
        }

        if (node.kind === 'method_declaration') {
            return this.parseMethodBody((node as MethodNode).body);
        }

        return [];
    }

    private parseMethodBody(body: AstNode[] | undefined): DatasetEntry[] {
        if (!body) {
            return [];
        }

        const returns = body.filter((s): s is ReturnStatementNode => s.kind === 'return_statement');
        const yields = body.filter((s): s is YieldExpressionNode => s.kind === 'yield_expression');

        if (returns.length === 1 && returns[0].value?.kind === 'array_creation_expression') {
            return this.extractEntries((returns[0].value as ArrayCreationNode).entries);
        }

        if (yields.length > 0) {
            return this.extractEntries(yields);
        }

        return [];
    }

    private extractEntries(entries: (ArrayEntryNode | YieldExpressionNode)[]): DatasetEntry[] {
        let numericIndex = 0;
        return entries.map((entry) => {
            if (entry.key?.kind === 'string' && entry.key.value) {
                return { label: `"${entry.key.value}"`, value: entry.key.value };
            }
            const idx = numericIndex++;
            if (entry.value?.kind === 'string') {
                return { label: `#${idx}`, value: (entry.value as StringNode).value };
            }
            return { label: `#${idx}`, value: `#${idx}` };
        });
    }
}

export const dataProviderParser = new DataProviderParser();
