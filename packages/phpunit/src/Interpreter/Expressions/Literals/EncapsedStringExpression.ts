import type { AstNode, EncapsedStringNode, VariableNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class EncapsedStringExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'encapsed_string';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        return (node as EncapsedStringNode).parts
            .map((part) => {
                if (part.kind === 'string') {
                    return part.value;
                }
                if (part.kind === 'variable') {
                    return context.resolve(part) ?? `$${(part as VariableNode).name}`;
                }
                return '';
            })
            .join('');
    }
}

export const encapsedStringExpression = new EncapsedStringExpression();
