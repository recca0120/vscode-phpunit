import { readFileSync } from 'node:fs';
import type { AnsiStyle } from './AnsiStyle';
import { highlightPhp } from './PhpHighlighter';

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

    const mark = isTarget ? style.failedMark(' ➜ ') : '   ';
    const lineNum = isTarget ? style.bold(num) : style.lineNumber(num);
    const delimiter = style.lineNumber(' ▕ ');
    const coloredContent = highlightPhp(content, style);

    return `${mark}${lineNum}${delimiter}${coloredContent}`;
}
