import { normalize } from 'path';
import { readFileSync } from 'fs';

export class Filesystem {
    get(path: string): string {
        return readFileSync(this.normalizePath(path)).toString('utf8');
    }

    normalizePath(path: string) {
        return normalize(path.replace(/^file:\/\//, '').replace(/^\/(\w)%3A/, '$1:'));
    }
}
