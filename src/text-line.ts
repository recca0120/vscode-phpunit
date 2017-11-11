import { Filesystem } from './filesystem';
import { tap } from './helpers';

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

const cache: Map<string, string[]> = new Map<string, string[]>();

export class TextLineFactory {
    private cache: Map<string, string[]>;

    constructor(private files: Filesystem = new Filesystem()) {
        this.cache = cache;
    }

    create(file, pattern: RegExp): Promise<TextLine> {
        return this.read(file).then(lines => {
            let lineNumber = 0;
            let text = '';
            for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i]) === true) {
                    lineNumber = i + 1;
                    text = lines[i];
                    break;
                }
            }
            const firstNonWhitespaceCharacterIndex = text.search(/\S|$/);

            return Promise.resolve({
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
            });
        });
    }

    reset() {
        this.cache.clear();
    }

    private read(file: string): Promise<string[]> {
        if (this.cache.has(file) === true) {
            return Promise.resolve(this.cache.get(file));
        }

        return this.files.getAsync(file).then((content: string) => {
            return Promise.resolve(
                tap(content.split(/\r\n|\n/), lines => {
                    this.cache.set(file, lines);
                })
            );
        });
    }
}
