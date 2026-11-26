import { dirname, isAbsolute, join, normalize } from 'node:path';
import type { AstNode } from '../Interpreter/AstParser/AstNode';

export function resolveIncludes(ast: AstNode, file: string): string[] {
    return topLevelStatements(ast)
        .map((statement) =>
            statement.kind === 'expression_statement' &&
            statement.expression.kind === 'include_expression'
                ? resolvePath(statement.expression.path, file)
                : undefined,
        )
        .filter((path): path is string => path !== undefined)
        .map((path) => normalize(isAbsolute(path) ? path : join(dirname(file), path)));
}

function topLevelStatements(ast: AstNode): AstNode[] {
    if (ast.kind !== 'program') {
        return [];
    }
    return ast.children.flatMap((child) =>
        child.kind === 'namespace_definition' ? child.children : [child],
    );
}

function resolvePath(node: AstNode, file: string): string | undefined {
    if (node.kind === 'string') {
        return node.value;
    }
    if (node.kind === 'magic_constant') {
        return magicConstant(node.name, file);
    }
    if (node.kind === 'binary_expression' && node.operator === '.') {
        const left = resolvePath(node.left, file);
        const right = resolvePath(node.right, file);
        return left !== undefined && right !== undefined ? left + right : undefined;
    }
    if (node.kind === 'function_call_expression' && node.name === 'dirname' && !node.chain) {
        const argument = node.arguments.length === 1 ? node.arguments[0] : undefined;
        const path = argument ? resolvePath(argument, file) : undefined;
        return path !== undefined ? dirname(path) : undefined;
    }
    return undefined;
}

function magicConstant(name: string, file: string): string | undefined {
    if (name === '__DIR__') {
        return dirname(file);
    }
    if (name === '__FILE__') {
        return file;
    }
    return undefined;
}
