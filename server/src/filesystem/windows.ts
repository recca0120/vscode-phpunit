import { POSIX } from './posix';
import { FilesystemContract } from '.';

export class WINDOWS extends POSIX {
    protected separator: string = '\\';

    normalizePath(path: string): string {
        return path
            .replace(/^file:\/\//, '')
            .replace(/^\/(\w)%3A/, '$1:')
            .replace(/\//g, this.separator)
            .replace(/ /g, '\\ ');
    }

    setSystemPaths(systemPaths: string): FilesystemContract {
        this.systemPaths = systemPaths.split(/;/g).map((path: string) => path.replace(/(;)$/, '').trim());

        return this;
    }
}
