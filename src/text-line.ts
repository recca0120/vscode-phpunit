import { CachableFilesystem, FilesystemInterface } from './filesystem';
import { normalizePath, tap } from './helpers';

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

    search(content: string, pattern: RegExp, mutiple: boolean = true): Promise<TextLine[]> {
        return new Promise(resolve => {
            const lines = content.split(/\r\n|\n/);
            const results: TextLine[] = [];

            for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i]) === true) {
                    results.push(this.createTextLine(i, lines[i]));
                    if (mutiple === false) {
                        break;
                    }
                }
            }

            resolve(results);
        });
    }

    searchFile(file, pattern: RegExp, mutiple: boolean = true): Promise<TextLine[]> {
        return this.getContent(file).then(content => this.search(content, pattern, mutiple));
    }

    dispose() {
        this.cache.clear();
    }

    private createTextLine(lineNumber: number, text: string): TextLine {
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
            return Promise.resolve(this.cache.get(normalizePath(file)));
        }

        return this.files.getAsync(file).then((content: string) => {
            return Promise.resolve(
                tap(content, content => {
                    this.cache.set(normalizePath(file), content);
                })
            );
        });
    }
}
