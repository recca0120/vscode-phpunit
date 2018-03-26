import { readFileSync } from 'fs';
import { FilesystemContract } from './contract';
import { statSync } from 'fs';

export function isWindows(): boolean {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform);
}

export abstract class Common implements FilesystemContract {
    exists(path: string): boolean {
        try {
            statSync(path);
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

    isWindows(): boolean {
        return isWindows();
    }

    abstract normalizePath(path: string): string;
}
