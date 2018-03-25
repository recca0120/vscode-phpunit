import { readFileSync } from 'fs';
import { FilesystemContract } from './contract';

export function isWindows(): boolean {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform);
}

export abstract class Common implements FilesystemContract {
    get(path: string): string {
        return readFileSync(this.normalizePath(path)).toString('utf8');
    }

    abstract normalizePath(path: string): string;

    isWindows(): boolean {
        return isWindows();
    }
}
