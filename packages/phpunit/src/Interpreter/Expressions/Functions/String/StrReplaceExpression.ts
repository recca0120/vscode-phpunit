import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class StrReplaceExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return (
            node.kind === 'function_call_expression' && (node as CallNode).name === 'str_replace'
        );
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const args = (node as CallNode).arguments;
        const search = context.resolve(args[0]);
        const replace = context.resolve(args[1]);
        const subject = context.resolve(args[2]);
        if (
            typeof search !== 'string' ||
            typeof replace !== 'string' ||
            typeof subject !== 'string'
        ) {
            return undefined;
        }
        return subject.split(search).join(replace);
    }
}

export const strReplaceExpression = new StrReplaceExpression();
