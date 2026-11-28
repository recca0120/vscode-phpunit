import type {
    AstNode,
    ClassConstantAccessNode,
    ConstDeclarationNode,
} from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

const refersToOwnClass = (scope: string, className?: string) =>
    scope === 'self' || scope === 'static' || scope.split('\\').pop() === className;

class ClassConstantAccessExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'class_constant_access';
    }

    resolve(node: AstNode, context: Context): unknown {
        if (!context.classBody) {
            return undefined;
        }

        const cca = node as ClassConstantAccessNode;
        if (!refersToOwnClass(cca.scope, context.className)) {
            return undefined;
        }

        const constDecl = context.classBody.find(
            (n): n is ConstDeclarationNode => n.kind === 'const_declaration' && n.name === cca.name,
        );

        if (!constDecl?.value) {
            return undefined;
        }

        return context.resolve(constDecl.value);
    }
}

export const classConstantAccessExpression = new ClassConstantAccessExpression();
