import { readFileSync } from 'fs';
import { FilesystemContract } from './contract';
import { statSync } from 'fs';

export abstract class Common implements FilesystemContract {
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

    abstract normalizePath(path: string): string;
}
