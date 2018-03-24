import { readFileSync } from 'fs';
import { isWindows } from './helpers';

export class POSIX {
    protected separator: string = '/';

    normalizePath(path: string) {
        return path.replace(/^file:\/\//, '').replace(/ /g, '\\ ');
    }
}

export class WINDOWS {
    protected separator: string = '\\';

    normalizePath(path: string) {
        return path
            .replace(/^file:\/\//, '')
            .replace(/^\/(\w)%3A/, '$1:')
            .replace(/\//g, this.separator)
            .replace(/ /g, '\\ ');
    }
}

export class Filesystem {
    constructor(private instance = isWindows() ? new WINDOWS() : new POSIX()) {}

    get(path: string): string {
        return readFileSync(this.normalizePath(path)).toString('utf8');
    }

    normalizePath(path: string) {
        return this.instance.normalizePath(path);
    }
}

export const files = new Filesystem();
export default files;
