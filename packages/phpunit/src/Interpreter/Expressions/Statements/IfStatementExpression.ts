import type { AstNode, IfStatementNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';
import { compare } from '../Operators/BinaryExpression';

class IfStatementExpression implements Expression<boolean> {
    supports(node: AstNode): boolean {
        return node.kind === 'if_statement';
    }

    resolve(node: AstNode, context: Context): boolean | undefined {
        const ifStmt = node as IfStatementNode;
        return compare(ifStmt.condition, context);
    }
}

export const ifStatementExpression = new IfStatementExpression();
