import type { AstNode } from '../AstParser/AstNode';

export type Bindings = Record<string, unknown>;

export interface Context {
    readonly bindings: Bindings;
    readonly classBody?: AstNode[];
    resolve(node: AstNode): unknown;
    fork(bindings: Bindings, classBody?: AstNode[]): Context;
}

export interface Expression<T> {
    supports(node: AstNode): boolean;
    resolve(node: AstNode, context: Context): T | undefined;
}
