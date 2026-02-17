import type { AstNode } from '../AstNode';
import type { AstParser } from '../AstParser';
import { adapt } from './TreeSitterAdapter';
import { isTreeSitterReady, parsePhp } from './TreeSitterParser';

export class TreeSitterAstParser implements AstParser {
    parse(code: string, _file: string): AstNode | undefined {
        if (!isTreeSitterReady()) {
            return undefined;
        }

        try {
            const tree = parsePhp(code);
            const ast = adapt(tree.rootNode);
            tree.delete();

            return ast as AstNode;
        } catch {
            return undefined;
        }
    }
}
