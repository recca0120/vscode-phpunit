import type { AstNode, CallNode, ExpressionStatementNode } from '../AstParser/AstNode';
import type { Interpreter } from '../Interpreter';
import type { Visitor } from '../types';
import { type NamespaceScope, NamespaceVisitor } from './NamespaceVisitor';

export class CallVisitor implements Visitor {
    readonly nodeKinds = ['expression_statement'];

    private _calls: CallNode[] = [];
    private _scopes = new Map<CallNode, NamespaceScope | undefined>();

    get calls(): CallNode[] {
        return this._calls;
    }

    scopeOf(call: CallNode): NamespaceScope | undefined {
        return this._scopes.get(call);
    }

    reset(): void {
        this._calls = [];
        this._scopes = new Map();
    }

    visit(node: AstNode, interpreter: Interpreter): void {
        const expr = (node as ExpressionStatementNode).expression;
        if (expr.kind === 'function_call_expression') {
            this._calls.push(expr as CallNode);
            this._scopes.set(expr as CallNode, interpreter.getVisitor(NamespaceVisitor).current);
        }
    }
}
