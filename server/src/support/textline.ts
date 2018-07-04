import { Filesystem, Factory as FilesystemFactory } from '../filesystem';
import { Range } from 'vscode-languageserver-types';

export class Textline {
    constructor(private files: Filesystem = new FilesystemFactory().create()) {}

    async line(path: string, lineAt: number): Promise<Range> {
        const lines: string[] = await this.lines(path);

        return this.createRange(lineAt, lines[lineAt]);
    }

    private createRange(lineAt: number, line: string) {
        const firstCharacter: number = line.search(/\S|$/);

        return Range.create(
            {
                line: lineAt,
                character: firstCharacter,
            },
            {
                line: lineAt,
                character: firstCharacter + line.trim().length,
            }
        );
    }

    async lines(path: string): Promise<string[]> {
        const contents: string = await this.files.get(path);

        return contents.split(/\r?\n/g);
    }
}
