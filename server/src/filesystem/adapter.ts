import { FilesystemContract } from './contract';
import { OS, os } from '../helpers';
import { POSIX } from './posix';
import { WINDOWS } from './windows';

export class Adapter implements FilesystemContract {
    constructor(private instance: FilesystemContract = os() === OS.WIN ? new WINDOWS() : new POSIX()) {}

    exists(path: string): boolean {
        return this.instance.exists(path);
    }

    get(path: string): string {
        return this.instance.get(path);
    }

    where(search: string, cwd: string = process.cwd()): string {
        return this.instance.where(search, cwd);
    }

    which(search: string, cwd: string = process.cwd()): string {
        return this.instance.which(search, cwd);
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
}
