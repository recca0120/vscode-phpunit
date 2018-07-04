import { Filesystem, Factory as FilesystemFactory } from '../filesystem';
import { Range } from 'vscode-languageserver-protocol';

export class Textline {
    constructor(private files: Filesystem = new FilesystemFactory().create()) {}

    async line(path: string, lineAt: number): Promise<Range> {
        const contents: string = await this.files.get(path);
        const lines: string[] = contents.split(/\r?\n/g);
        const line = lines[lineAt];
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
}
