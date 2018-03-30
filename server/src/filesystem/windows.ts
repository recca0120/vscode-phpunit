import { POSIX } from './posix';

export class WINDOWS extends POSIX {
    protected separator: string = '\\';
    protected delimiter: string = ';';
    protected extensions = ['.bat', '.exe', '.cmd', ''];

    normalizePath(path: string): string {
        return path
            .replace(/^file:\/\//, '')
            .replace(/^\/(\w)%3A/, '$1:')
            .replace(/\//g, this.separator)
            .replace(/ /g, '\\ ');
    }
}
