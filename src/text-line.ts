import { CachableFilesystem, FilesystemInterface } from './filesystem';
import { normalizePath, tap } from './helpers';

interface Line {
    text: string;
    lineNumber: number;
}

export interface Task {
    (text: string, lineNumber: number, index: number, input: string): Line;
}

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface TextLine {
    /**
     * The zero-based line number.
     */
    readonly lineNumber: number;

    /**
     * The text of this line without the line separator characters.
     */
    readonly text: string;

    /**
     * The range this line covers without the line separator characters.
     */
    readonly range: Range;

    /**
     * The range this line covers with the line separator characters.
     */
    // readonly rangeIncludingLineBreak: Range;

    /**
     * The offset of the first character which is not a whitespace character as defined
     * by `/\s/`. **Note** that if a line is all whitespaces the length of the line is returned.
     */
    readonly firstNonWhitespaceCharacterIndex: number;

    /**
     * Whether this line is whitespace only, shorthand
     * for [TextLineFactory.firstNonWhitespaceCharacterIndex](#TextLineFactory.firstNonWhitespaceCharacterIndex) === [TextLineFactory.text.length](#TextLineFactory.text).
     */
    readonly isEmptyOrWhitespace: boolean;
}

export const TextLineCache: Map<string, string> = new Map<string, string>();

export class TextLineFactory {
    private cache: Map<string, string>;

    constructor(private files: FilesystemInterface = new CachableFilesystem()) {
        this.cache = TextLineCache;
    }

    search(content: string, pattern: RegExp, toTextLine: Task = this.toTextLine): Promise<TextLine[]> {
        return new Promise(resolve => {
            const results: TextLine[] = [];

            if (pattern.flags.indexOf('g') !== -1) {
                let match: RegExpExecArray | null;
                while ((match = pattern.exec(content)) !== null) {
                    const { text, lineNumber, index, input } = this.parseRegExpExecArray(match as RegExpExecArray);
                    results.push(this.createTextLine(toTextLine(text, lineNumber, index, input)));
                }
            } else {
                const match: RegExpExecArray | null = pattern.exec(content);

                if (match === null) {
                    return resolve(results);
                }

                const { text, lineNumber, index, input } = this.parseRegExpExecArray(match as RegExpExecArray);
                results.push(this.createTextLine(toTextLine(text, lineNumber, index, input)));
            }

            resolve(results.filter(item => item.lineNumber !== 0));
        });
    }

    searchFile(file: string, pattern: RegExp, toTextLine: Task = this.toTextLine): Promise<TextLine[]> {
        return this.getContent(file).then((content: string) => this.search(content, pattern, toTextLine));
    }

    dispose() {
        this.cache.clear();
    }

    private createTextLine(line: Line): TextLine {
        const { lineNumber, text } = line;
        const firstNonWhitespaceCharacterIndex = text.search(/\S|$/);

        return {
            lineNumber,
            text,
            range: {
                start: {
                    line: lineNumber,
                    character: firstNonWhitespaceCharacterIndex,
                },
                end: {
                    line: lineNumber,
                    character: text.length,
                },
            },
            // rangeIncludingLineBreak
            firstNonWhitespaceCharacterIndex: firstNonWhitespaceCharacterIndex,
            isEmptyOrWhitespace: text.length === 0,
        };
    }

    private getContent(file: string): Promise<string> {
        if (this.cache.has(normalizePath(file)) === true) {
            return Promise.resolve(this.cache.get(normalizePath(file)) || '');
        }

        return this.files.getAsync(file).then((content: string) => {
            return Promise.resolve(
                tap(content, (content: string) => {
                    this.cache.set(normalizePath(file), content);
                })
            );
        });
    }

    private toTextLine(text: string, lineNumber: number): Line {
        return {
            lineNumber,
            text,
        };
    }

    private parseRegExpExecArray(match: RegExpExecArray) {
        const text = match[0];
        const index = match.index;
        const input = match.input;
        const lineNumber = input.substr(0, index).split(/\n/).length - 1;

        return {
            text,
            lineNumber,
            index,
            input,
        };
    }
}
