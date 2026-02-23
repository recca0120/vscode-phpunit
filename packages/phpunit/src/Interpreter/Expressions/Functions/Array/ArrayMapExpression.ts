import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';
import { extractLabels } from '../../PhpExpression';

class ArrayMapExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'array_map';
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const args = (node as CallNode).arguments;
        if (args.length < 2) {
            return undefined;
        }
        const resolved = context.resolve(args[1]);
        if (!(resolved instanceof Map)) {
            return undefined;
        }
        return extractLabels(resolved);
    }
}

export const arrayMapExpression = new ArrayMapExpression();
