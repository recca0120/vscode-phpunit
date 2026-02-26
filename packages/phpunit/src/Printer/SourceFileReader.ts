import { readFileSync } from 'node:fs';
import type { AnsiStyle } from './AnsiStyle';

export function fileFormat(file: string, line: number) {
    return `${file}:${line}`;
}

export function readSourceSnippet(
    filePath: string,
    targetLine: number,
    style?: AnsiStyle,
    displayPath?: string,
): string[] | undefined {
    try {
        const data = readFileSync(filePath, 'utf8');
        const position = Math.max(0, targetLine - 5);
        const lines = data
            .split(/\r\n|\n/)
            .slice(position, position + 9)
            .map((line, index) => {
                const currentPosition = position + index + 1;
                const isTarget = targetLine === currentPosition;

                return formatSnippetLine(currentPosition, line, isTarget, style);
            });

        const display = displayPath ?? filePath;
        const atHeader = style
            ? `at ${style.passed(fileFormat(display, targetLine))}`
            : `at ${fileFormat(display, targetLine)}`;

        return ['', atHeader, ...lines];
    } catch (_e) {
        return undefined;
    }
}

function formatSnippetLine(
    lineNumber: number,
    content: string,
    isTarget: boolean,
    style?: AnsiStyle,
): string {
    const num = String(lineNumber).padStart(2, ' ');

    if (!style) {
        const prefix = isTarget ? ' ➜ ' : '   ';

        return `${prefix}${num} ▕ ${content}`;
    }

    // Collision style: arrow red+bold, line number dark_gray or italic+bold, delimiter dark_gray
    const mark = isTarget ? style.failedMark(' ➜ ') : '   ';
    const lineNum = isTarget ? style.bold(num) : style.lineNumber(num);
    const delimiter = style.lineNumber(' ▕ ');
    const coloredContent = highlightPhp(content, style);

    return `${mark}${lineNum}${delimiter}${coloredContent}`;
}

/**
 * Simple regex-based PHP syntax highlighting matching Collision's token colors:
 * - keywords: magenta+bold
 * - strings: light_gray (white)
 * - comments: dark_gray+italic
 * - variables: default+bold
 * - numbers: default+bold
 */
function highlightPhp(line: string, style: AnsiStyle): string {
    // Process from left to right, matching tokens greedily
    let result = '';
    let pos = 0;

    while (pos < line.length) {
        // Single-line comment: // or #
        const commentMatch = line.slice(pos).match(/^(?:\/\/|#).*/);
        if (commentMatch) {
            result += style.comment(commentMatch[0]);
            pos += commentMatch[0].length;
            continue;
        }

        // Block comment start (may not close on same line)
        const blockCommentMatch = line.slice(pos).match(/^\/\*.*?(?:\*\/|$)/);
        if (blockCommentMatch) {
            result += style.comment(blockCommentMatch[0]);
            pos += blockCommentMatch[0].length;
            continue;
        }

        // Doc comment continuation: lines starting with * (but not *=, */, etc.)
        if (pos === 0 || line.slice(0, pos).trim() === '') {
            const docContMatch = line.slice(pos).match(/^\s*\*(?!\s*\$)(?!\s*\d).*/);
            if (docContMatch) {
                result += style.comment(docContMatch[0]);
                pos += docContMatch[0].length;
                continue;
            }
        }

        // Strings: single or double quoted
        const stringMatch = line.slice(pos).match(/^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/);
        if (stringMatch) {
            result += style.string(stringMatch[0]);
            pos += stringMatch[0].length;
            continue;
        }

        // PHP keywords
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

        // Variables: $name
        const varMatch = line.slice(pos).match(/^\$[a-zA-Z_]\w*/);
        if (varMatch) {
            result += style.variable(varMatch[0]);
            pos += varMatch[0].length;
            continue;
        }

        // Numbers
        const numMatch = line.slice(pos).match(/^\d+(?:\.\d+)?/);
        if (numMatch) {
            result += style.variable(numMatch[0]);
            pos += numMatch[0].length;
            continue;
        }

        // Default: pass through character by character
        result += line[pos];
        pos++;
    }

    return result;
}
