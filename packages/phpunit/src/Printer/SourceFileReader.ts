import { readFileSync } from 'node:fs';

export function fileFormat(file: string, line: number) {
    return `${file}:${line}`;
}

export function readSourceSnippet(filePath: string, targetLine: number): string[] | undefined {
    try {
        const data = readFileSync(filePath, 'utf8');
        const position = Math.max(0, targetLine - 5);
        const lines = data
            .split(/\r\n|\n/)
            .slice(position, position + 10)
            .map((line, index) => {
                const currentPosition = position + index + 1;
                const prefix = targetLine === currentPosition ? '➜ ' : '  ';

                return `${prefix}${String(currentPosition).padStart(2, ' ')} ▕ ${line}`;
            });

        return ['', `at ${fileFormat(filePath, targetLine)}`, ...lines];
    } catch (_e) {
        return undefined;
    }
}
