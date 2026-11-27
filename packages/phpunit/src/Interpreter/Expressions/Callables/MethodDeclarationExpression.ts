import type { AstNode, MethodNode } from '../../AstParser/AstNode';
import { resolveCompoundBody } from '../ControlFlow/CompoundStatementExpression';
import type { Context, Expression } from '../Expression';

class MethodDeclarationExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'method_declaration';
    }

    resolve(node: AstNode, context: Context): unknown {
        const body = (node as MethodNode).body;
        if (!body) {
            return undefined;
        }

        return resolveCompoundBody(body, context);
    }
}

export const methodDeclarationExpression = new MethodDeclarationExpression();
