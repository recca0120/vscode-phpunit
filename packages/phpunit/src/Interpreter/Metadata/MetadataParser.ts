import type { ClassNode, MethodNode } from '../AstParser/AstNode';
import type { Metadata } from './Metadata';

export interface MetadataParser {
    forClass(node: ClassNode): Metadata[];
    forMethod(node: MethodNode): Metadata[];
}
