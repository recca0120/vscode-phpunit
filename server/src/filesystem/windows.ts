import { POSIX } from './posix';

export class WINDOWS extends POSIX {
    protected separator: string = '\\';

    normalizePath(path: string) {
        return path
            .replace(/^file:\/\//, '')
            .replace(/^\/(\w)%3A/, '$1:')
            .replace(/\//g, this.separator)
            .replace(/ /g, '\\ ');
    }
}
