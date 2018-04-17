import { Filesystem, FilesystemContract } from '../filesystem';
import { Range } from 'vscode-languageserver-types';

export class TextlineRange {
    private items: Map<string, string[]> = new Map<string, string[]>();

    constructor(private files: FilesystemContract = new Filesystem()) {}

    async create(uri: string, lineAt: number): Promise<Range> {
        return this.createRange(await this.getLines(uri), lineAt);
    }

    async findMethod(uri: string, lineAt: number): Promise<string> {
        const lines: string[] = await this.getLines(uri);

        while (lineAt > 0) {
            const line: string = lines[lineAt];
            const match = line.match(/^\s*(?:public|private|protected)?\s*function\s*(\w+)\s*\(.*$/);
            if (match) {
                return match[1];
            }
            lineAt = lineAt - 1;
        }

        return '';
    }

    clear(): TextlineRange {
        this.items.clear();

        return this;
    }

    private createRange(lines: string[], lineAt: number): Range {
        const line: string = lines[lineAt];
        const firstNonWhitespaceCharacterIndex: number = line.search(/\S|$/);

        return Range.create(
            {
                line: lineAt,
                character: firstNonWhitespaceCharacterIndex,
            },
            {
                line: lineAt,
                character: firstNonWhitespaceCharacterIndex + line.trim().length,
            }
        );
    }

    private async getLines(uri: string): Promise<string[]> {
        if (this.items.has(uri) === false) {
            const content: string = await this.files.get(uri);
            this.items.set(uri, content.split(/\r?\n/g));
        }

        return this.items.get(uri) || [];
    }
}
