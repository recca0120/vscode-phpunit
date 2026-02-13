import { readFileSync } from 'node:fs';
import { OutputFormatter } from './OutputFormatter';

export function readSourceSnippet(filePath: string, targetLine: number): string[] | undefined {
    try {
        const data = readFileSync(filePath, 'utf8');
        const position = Math.max(0, targetLine - 5);
        const lines = data
            .split(/\r\n|\n/)
            .splice(position, 10)
            .map((line, index) => {
                const currentPosition = position + index + 1;
                const prefix = targetLine === currentPosition ? '➜ ' : '  ';

                return `${prefix}${String(currentPosition).padStart(2, ' ')} ▕ ${line}`;
            });

        return ['', `at ${OutputFormatter.fileFormat(filePath, targetLine)}`, ...lines];
    } catch (_e) {
        return undefined;
    }
}
