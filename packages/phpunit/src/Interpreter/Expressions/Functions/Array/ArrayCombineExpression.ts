import { datasetIndexed, datasetNamed } from '../../../../utils';
import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class ArrayCombineExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return (
            node.kind === 'function_call_expression' && (node as CallNode).name === 'array_combine'
        );
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const args = (node as CallNode).arguments;
        if (args.length < 2) {
            return undefined;
        }
        const resolved = context.resolve(args[0]);
        if (!(resolved instanceof Map)) {
            return undefined;
        }
        return [...resolved.values()].map((item, i) =>
            typeof item === 'string' ? datasetNamed(item) : datasetIndexed(i),
        );
    }
}

export const arrayCombineExpression = new ArrayCombineExpression();
