import type { AstNode, CallNode, ExpressionStatementNode } from '../AstParser/AstNode';
import type { Interpreter } from '../Interpreter';
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

    visit(node: AstNode, _interpreter: Interpreter): void {
        const expr = (node as ExpressionStatementNode).expression;
        if (expr.kind === 'function_call_expression') {
            this._calls.push(expr as CallNode);
        }
    }
}
