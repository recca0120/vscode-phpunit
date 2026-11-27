import type { AnsiStyle } from './AnsiStyle';

export function highlightPhp(line: string, style: AnsiStyle): string {
    let result = '';
    let pos = 0;

    while (pos < line.length) {
        const commentMatch = line.slice(pos).match(/^(?:\/\/|#).*/);
        if (commentMatch) {
            result += style.comment(commentMatch[0]);
            pos += commentMatch[0].length;
            continue;
        }

        const blockCommentMatch = line.slice(pos).match(/^\/\*.*?(?:\*\/|$)/);
        if (blockCommentMatch) {
            result += style.comment(blockCommentMatch[0]);
            pos += blockCommentMatch[0].length;
            continue;
        }

        if (pos === 0 || line.slice(0, pos).trim() === '') {
            const docContMatch = line.slice(pos).match(/^\s*\*(?!\s*\$)(?!\s*\d).*/);
            if (docContMatch) {
                result += style.comment(docContMatch[0]);
                pos += docContMatch[0].length;
                continue;
            }
        }

        const stringMatch = line.slice(pos).match(/^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/);
        if (stringMatch) {
            result += style.string(stringMatch[0]);
            pos += stringMatch[0].length;
            continue;
        }

        const keywordMatch = line
            .slice(pos)
            .match(
                /^(?:abstract|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|null|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|void|while|yield)\b/,
            );
        if (keywordMatch) {
            result += style.keyword(keywordMatch[0]);
            pos += keywordMatch[0].length;
            continue;
        }

        const varMatch = line.slice(pos).match(/^\$[a-zA-Z_]\w*/);
        if (varMatch) {
            result += style.variable(varMatch[0]);
            pos += varMatch[0].length;
            continue;
        }

        const numMatch = line.slice(pos).match(/^\d+(?:\.\d+)?/);
        if (numMatch) {
            result += style.variable(numMatch[0]);
            pos += numMatch[0].length;
            continue;
        }

        result += line[pos];
        pos++;
    }

    return result;
}
