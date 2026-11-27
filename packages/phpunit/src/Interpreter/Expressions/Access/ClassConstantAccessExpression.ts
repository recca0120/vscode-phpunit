import type {
    AstNode,
    ClassConstantAccessNode,
    ConstDeclarationNode,
} from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class ClassConstantAccessExpression implements Expression<Map<string, unknown>> {
    supports(node: AstNode): boolean {
        return node.kind === 'class_constant_access';
    }

    resolve(node: AstNode, context: Context): Map<string, unknown> | undefined {
        if (!context.classBody) {
            return undefined;
        }

        const cca = node as ClassConstantAccessNode;
        const constDecl = context.classBody.find(
            (n): n is ConstDeclarationNode => n.kind === 'const_declaration' && n.name === cca.name,
        );

        if (!constDecl?.value) {
            return undefined;
        }

        const result = context.resolve(constDecl.value);
        return result instanceof Map ? result : undefined;
    }
}

export const classConstantAccessExpression = new ClassConstantAccessExpression();
