import type { AstNode, CallNode, ExpressionStatementNode } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Visitor } from '../types';

export class CallVisitor implements Visitor {
    readonly nodeKinds = ['expression_statement'];

    private _calls: CallNode[] = [];

    get calls(): CallNode[] {
        return this._calls;
    }

    reset(): void {
        this._calls = [];
    }

    visit(node: AstNode, _php: PHP): void {
        const expr = (node as ExpressionStatementNode).expression;
        if (expr.kind === 'function_call_expression') {
            this._calls.push(expr as CallNode);
        }
    }
}
