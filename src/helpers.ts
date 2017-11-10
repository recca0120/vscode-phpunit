import { readFile } from 'fs';

export function isWindows(): boolean {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform);
}

export function tap(val: any, callback: Function): any {
    callback(val);

    return val;
}

export function readFileAsync(filePath: string, encoding = 'utf8'): Promise<string> {
    return new Promise((resolve, reject) => {
        readFile(filePath, encoding, (error, data) => {
            return error ? reject(error) : resolve(data);
        });
    });
}

const cache: Map<string, Array<string>> = new Map<string, Array<string>>();

export class LineData {
    private cache: Map<string, Array<string>>;

    constructor() {
        this.cache = cache;
    }

    lineNumber(file, keyword): Promise<number> {
        return this.getLines(file).then(lines => {
            let lineNumber = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].indexOf(keyword) !== -1) {
                    lineNumber = i + 1;
                    break;
                }
            }

            return Promise.resolve(lineNumber);
        });
    }

    private getLines(file: string): Promise<Array<string>> {
        if (this.cache.has(file) === true) {
            return Promise.resolve(this.cache.get(file));
        }

        return readFileAsync(file).then((content: string) => {
            return Promise.resolve(
                tap(content.split(/\r\n|\n/), lines => {
                    this.cache.set(file, lines);
                })
            );
        });
    }
}
