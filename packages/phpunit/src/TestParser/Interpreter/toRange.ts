import type { AstNodeLoc } from '../AstParser/AstNode';
import type { Range } from './types';

export function toRange(loc: AstNodeLoc | undefined): Range {
    if (!loc) {
        return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
    }
    return {
        start: { line: loc.start.row + 1, character: loc.start.column },
        end: { line: loc.end.row + 1, character: loc.end.column },
    };
}
