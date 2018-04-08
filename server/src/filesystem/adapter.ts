import { FilesystemContract } from './contract';
import { OS, os } from '../helpers';
import { POSIX } from './posix';
import { WINDOWS } from './windows';

export class Adapter implements FilesystemContract {
    constructor(private instance: FilesystemContract = os() === OS.WIN ? new WINDOWS() : new POSIX()) {}

    exists(path: string): Promise<boolean> {
        return this.instance.exists(path);
    }

    get(path: string): Promise<string> {
        return this.instance.get(path);
    }

    where(search: string, cwd: string = process.cwd()): Promise<string> {
        return this.instance.where(search, cwd);
    }

    which(search: string, cwd: string = process.cwd()): Promise<string> {
        return this.instance.which(search, cwd);
    }

    findUp(search: string, cwd: string = process.cwd(), root?: string): Promise<string> {
        return this.instance.findUp(search, cwd, root);
    }

    normalizePath(path: string): string {
        return this.instance.normalizePath(path);
    }

    setSystemPaths(systemPaths: string): FilesystemContract {
        this.instance.setSystemPaths(systemPaths);

        return this;
    }

    getSystemPaths(): string[] {
        throw this.instance.getSystemPaths();
    }

    dirname(path: string): string {
        return this.instance.dirname(path);
    }

    tmpfile(extension: string = 'tmp', prefix?: string): string {
        return this.instance.tmpfile(extension, prefix);
    }

    unlink(path: string): Promise<boolean> {
        return this.instance.unlink(path);
    }

    uri(path: string): string {
        return this.instance.uri(path);
    }
}

export class Filesystem extends Adapter {}
