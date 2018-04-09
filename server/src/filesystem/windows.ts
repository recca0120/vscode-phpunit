import { POSIX } from './posix';

export class WINDOWS extends POSIX {
    protected separator: string = '\\';
    protected delimiter: string = ';';
    protected extensions = ['.bat', '.exe', '.cmd', ''];

    constructor() {
        super();
        this.setSystemPaths(process.env.PATH as string);
    }

    normalizePath(path: string): string {
        return (
            path
                .replace(/^file:\/\//, '')
                .replace(/^\/(\w)(%3A|:)/, '$1:')
                // .replace(/^\w:/, m => m.toUpperCase())
                .replace(/\//g, this.separator)
                .replace(/ /g, '\\ ')
        );
    }
}
