import type { Comment } from 'php-parser';
import { Engine } from 'php-parser';
import type { AstNode } from '../AstNode';
import type { AstParser } from '../AstParser';
import { adapt } from './PhpParserAdapter';

const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { extractDoc: true, suppressErrors: false, version: 900 },
    lexer: {
        all_tokens: true,
        short_tags: true,
    },
});

export class PhpParserAstParser implements AstParser {
    parse(code: string, file: string): AstNode | undefined {
        try {
            const preprocessed = applyInlinePlaceholderWorkaround(code);
            const ast = engine.parseCode(preprocessed, file);
            if (ast.comments) {
                normalizeCommentLineBreaks(ast.comments);
            }

            return adapt(ast);
        } catch {
            return undefined;
        }
    }
}

/** Workaround for https://github.com/glayzzle/php-parser/issues/170 */
function applyInlinePlaceholderWorkaround(text: string): string {
    return text.replace(/\?>\r?\n<\?/g, '?>\n___PSEUDO_INLINE_PLACEHOLDER___<?');
}

/** Workaround for https://github.com/glayzzle/php-parser/issues/155 */
function normalizeCommentLineBreaks(comments: Comment[]): void {
    for (const comment of comments) {
        let trimmed = 0;
        while (comment.value.length > 0) {
            const last = comment.value[comment.value.length - 1];
            if (last !== '\r' && last !== '\n') {
                break;
            }
            comment.value = comment.value.slice(0, -1);
            trimmed++;
        }
        if (trimmed > 0) {
            // biome-ignore lint/style/noNonNullAssertion: loc is always present when withPositions is true
            comment.loc!.end.offset -= trimmed;
        }
    }
}
