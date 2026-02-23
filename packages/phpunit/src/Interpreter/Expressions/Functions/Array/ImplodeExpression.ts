import type {
    ArrayCreationNode,
    ArrayEntryNode,
    AstNode,
    CallNode,
} from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class ImplodeExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        if (node.kind !== 'function_call_expression') {
            return false;
        }
        const name = (node as CallNode).name;
        return name === 'implode' || name === 'join';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const args = (node as CallNode).arguments;
        const sep = context.resolve(args[0]);
        const arrayNode = args[1];
        if (arrayNode?.kind !== 'array_creation_expression') {
            return undefined;
        }
        const elements = (arrayNode as ArrayCreationNode).entries.map((entry: ArrayEntryNode) =>
            context.resolve(entry.value ?? entry),
        );
        if (elements.some((e) => e == null)) {
            return undefined;
        }
        return elements.map(String).join(sep != null ? String(sep) : '');
    }
}

export const implodeExpression = new ImplodeExpression();
