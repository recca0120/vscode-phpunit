import type { AstNode, MethodNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';
import { resolveCompoundBody } from './CompoundStatementExpression';

class MethodDeclarationExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return node.kind === 'method_declaration';
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const body = (node as MethodNode).body;
        if (!body) {
            return undefined;
        }

        return resolveCompoundBody(body, context);
    }
}

export const methodDeclarationExpression = new MethodDeclarationExpression();
