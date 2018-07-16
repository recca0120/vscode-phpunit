import { POSIX } from './posix';

export class WINDOWS extends POSIX {
    constructor(
        protected separator: string = '\\',
        protected delimiter: string = ';',
        protected extensions: string[] = ['.bat', '.exe', '.cmd', '']
    ) {
        super(separator, delimiter, extensions);
    }

    normalizePath(path: string): string {
        return (
            path
                .replace(/^file:\/\//, '')
                .replace(/^\/(\w)(%3A|:)/, '$1:')
                // .replace(/^\w:/, m => m.toUpperCase())
                .replace(/^\w:/, m => m.toLowerCase())
                .replace(/\//g, this.separator)
                .replace(/ /g, '\\ ')
        );
    }
}
