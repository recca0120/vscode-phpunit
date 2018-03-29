import { readFileSync, statSync } from 'fs';
import { FilesystemContract } from './contract';
import { resolve } from 'path';

export abstract class Common implements FilesystemContract {
    protected systemPaths: string[];
    protected extensions: string[] = [''];

    constructor() {
        this.setSystemPaths(process.env.PATH as string);
    }

    exists(path: string): boolean {
        try {
            statSync(this.normalizePath(path));
        } catch (err) {
            if (err.code === 'ENOENT') {
                return false;
            }
        }

        return true;
    }

    get(path: string): string {
        return readFileSync(this.normalizePath(path)).toString('utf8');
    }

    getSystemPaths(): string[] {
        return this.systemPaths;
    }

    where(search: string, cwd: string = process.cwd()): string {
        const paths: string[] = [cwd].concat(this.getSystemPaths());
        const extensions = this.extensions;

        for (const path of paths) {
            for (const ext of extensions) {
                const file = resolve(path, `${search}${ext}`);
                if (this.exists(file) === true) {
                    return file;
                }
            }
        }

        return '';
    }

    which(search: string, cwd: string = process.cwd()): string {
        return this.where(search, cwd);
    }

    abstract setSystemPaths(systemPaths: string): FilesystemContract;

    abstract normalizePath(path: string): string;
}
