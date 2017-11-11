import { Filesystem } from './filesystem';
import { tap } from './helpers';

const cache: Map<string, string[]> = new Map<string, string[]>();

export class TextRange {
    private cache: Map<string, string[]>;

    constructor(private files: Filesystem = new Filesystem()) {
        this.cache = cache;
    }

    lineNumber(file, pattern: RegExp): Promise<number> {
        return this.getLines(file).then(lines => {
            let lineNumber = 0;
            for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i]) === true) {
                    lineNumber = i + 1;
                    break;
                }
            }

            return Promise.resolve(lineNumber);
        });
    }

    reset() {
        this.cache.clear();
    }

    private getLines(file: string): Promise<string[]> {
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
