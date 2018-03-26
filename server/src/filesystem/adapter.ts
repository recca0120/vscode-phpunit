import { FilesystemContract } from './contract';
import { isWindows } from './common';
import { POSIX } from './posix';
import { WINDOWS } from './windows';

export class Filesystem implements FilesystemContract {
    constructor(private instance: FilesystemContract = isWindows() ? new WINDOWS() : new POSIX()) {}

    exists(path: string): boolean {
        return this.instance.exists(path);
    }

    get(path: string): string {
        return this.instance.get(path);
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
