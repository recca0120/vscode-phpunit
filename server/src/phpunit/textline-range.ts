import { FilesystemContract, Filesystem } from '../filesystem';
import { Range } from 'vscode-languageserver';

export class TextlineRange {
    private items: Map<string, string[]> = new Map<string, string[]>();

    constructor(private files: FilesystemContract = new Filesystem()) {}

    async create(file: string, lineAt: number): Promise<Range> {
        const lines: string[] = await this.getLines(file);
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

    clear(): TextlineRange {
        this.items.clear();

        return this;
    }

    private async getLines(file: string): Promise<string[]> {
        const uri: string = this.files.uri(file);

        if (this.items.has(uri) === false) {
            const content: string = await this.files.get(file);
            this.items.set(uri, content.split(/\r?\n/g));
        }

        return this.items.get(uri) || [];
    }
}
