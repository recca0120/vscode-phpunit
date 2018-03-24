import { readFileSync } from 'fs';

export function isWindows(): boolean {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform);
}

export interface FilesystemContract {
    get(path: string): string;
    normalizePath(path: string): string;
    isWindows(): boolean;
}

abstract class Base implements FilesystemContract {
    get(path: string): string {
        return readFileSync(this.normalizePath(path)).toString('utf8');
    }

    abstract normalizePath(path: string): string;

    isWindows(): boolean {
        return isWindows();
    }
}

export class POSIX extends Base {
    protected separator: string = '/';

    normalizePath(path: string) {
        return path.replace(/^file:\/\//, '').replace(/ /g, '\\ ');
    }
}

export class WINDOWS extends Base {
    protected separator: string = '\\';

    normalizePath(path: string) {
        return path
            .replace(/^file:\/\//, '')
            .replace(/^\/(\w)%3A/, '$1:')
            .replace(/\//g, this.separator)
            .replace(/ /g, '\\ ');
    }
}

export class Filesystem implements FilesystemContract {
    constructor(private instance: FilesystemContract = isWindows() ? new WINDOWS() : new POSIX()) {}

    get(path: string): string {
        return readFileSync(this.normalizePath(path)).toString('utf8');
    }

    normalizePath(path: string): string {
        return this.instance.normalizePath(path);
    }

    isWindows(): boolean {
        return this.instance.isWindows();
    }
}

export const files: FilesystemContract = new Filesystem();
export default files;
