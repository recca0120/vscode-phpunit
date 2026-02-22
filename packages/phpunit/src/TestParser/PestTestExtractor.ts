import { TestType } from '../types';
import type {
    ArrayCreationNode,
    ArrayEntryNode,
    CallNode,
    ExpressionStatementNode,
    NamespaceNode,
    StringNode,
} from './AstNode';
import { dataProviderParser } from './DataProviderParser';
import type { ParseResult, TestExtractor } from './TestExtractor';
import { TestNode } from './TestNode';

export class PestTestExtractor implements TestExtractor {
    extract(node: TestNode): ParseResult | undefined {
        const testDefinition = node.toTestDefinition();
        testDefinition.children = this.buildTestChildren(node);

        if (testDefinition.children.length === 0) {
            return undefined;
        }

        const parent = node.createNamespaceTestDefinition();
        parent.children = [testDefinition];

        return { tests: [parent], classes: [] };
    }

    private buildTestChildren(node: TestNode) {
        return getPestFunctions(node)
            .filter((child) => child.isTest())
            .map((child) => {
                const testDefinition = child.toTestDefinition();

                if (child.type === TestType.describe) {
                    testDefinition.children = this.buildTestChildren(child);
                } else {
                    const dataset = extractPestDataset(child);
                    if (dataset.length > 0) {
                        testDefinition.annotations = {
                            ...testDefinition.annotations,
                            dataset,
                        };
                    }
                }

                return testDefinition;
            });
    }
}

export function getPestFunctions(node: TestNode): TestNode[] {
    const args = node.arguments;

    if (node.type === TestType.describe) {
        return getPestFunctions(args[1]);
    }

    if (args.length > 1 && args[1].kind === 'argument') {
        return getPestFunctions(args[1]);
    }

    if (args.length > 1 && args[1].kind === 'arrow_function') {
        return [node.clone()];
    }

    const callableBody = node.getCallableBody();
    if (callableBody) {
        return getPestFunctions(callableBody);
    }

    return collectPestFunctions(node);
}

function extractPestDataset(testNode: TestNode): string[] {
    const withArrays: ArrayCreationNode[] = [];
    let parent = testNode.parent;
    // Parent chain walks from innermost to outermost: it() → with(A) → with(B)
    while (parent) {
        if (parent.kind === 'function_call_expression' && parent.name === 'with') {
            const callNode = parent.node as CallNode;
            const firstArg = callNode.arguments[0];
            if (firstArg?.kind === 'array_creation_expression') {
                withArrays.push(firstArg as ArrayCreationNode);
            }
        }
        parent = parent.parent;
    }

    if (withArrays.length === 0) {
        return [];
    }

    if (withArrays.length === 1) {
        return dataProviderParser.parse(withArrays[0]);
    }

    return cartesianProduct(withArrays.map(extractArrayValues));
}

function extractArrayValues(node: ArrayCreationNode): string[] {
    return node.entries.map((entry: ArrayEntryNode) => {
        if (entry.key?.kind === 'string' && entry.key.value) {
            return entry.key.value;
        }
        if (entry.value?.kind === 'string') {
            return (entry.value as StringNode).value;
        }
        return '';
    });
}

function cartesianProduct(datasets: string[][]): string[] {
    let combinations: string[][] = datasets[0].map((v) => [v]);
    for (let i = 1; i < datasets.length; i++) {
        combinations = combinations.flatMap((combo) => datasets[i].map((v) => [...combo, v]));
    }
    return combinations.map((combo) => `"(${combo.map((v) => `|'${v}|'`).join(', ')})"`);
}

function collectPestFunctions(parentNode: TestNode): TestNode[] {
    const children = parentNode.astChildren;

    const flatChildren = children.flatMap((node) =>
        node.kind === 'namespace_definition' ? (node as NamespaceNode).children : [node],
    );

    const definitions: TestNode[] = [];
    for (const node of flatChildren) {
        if (node.kind !== 'expression_statement') {
            continue;
        }

        const expr = (node as ExpressionStatementNode).expression;
        if (expr.kind === 'include_expression') {
            continue;
        }

        if (expr.kind !== 'function_call_expression') {
            continue;
        }

        const parent = parentNode.kind === 'compound_statement' ? parentNode.parent : parentNode;
        const opts = { ...parentNode.options, parent };

        // Walk the chain: [outermost, ..., innermost]
        const calls: CallNode[] = [];
        let cur: CallNode | undefined = expr as CallNode;
        while (cur) {
            calls.push(cur);
            cur = cur.chain;
        }

        // Set parents from outermost to innermost
        for (let i = 0; i < calls.length; i++) {
            if (i > 0) {
                opts.parent = new TestNode(calls[i - 1], { ...opts });
            }
        }

        const innermost = calls[calls.length - 1];
        definitions.push(new TestNode(innermost, opts));
    }

    return definitions;
}
