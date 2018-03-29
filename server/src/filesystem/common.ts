import { readFileSync } from 'fs';
import { FilesystemContract } from './contract';
import { statSync } from 'fs';

export abstract class Common implements FilesystemContract {
    protected systemPaths: string[];

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

    abstract setSystemPaths(systemPaths: string): FilesystemContract;

    abstract normalizePath(path: string): string;
}
