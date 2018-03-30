import { Common } from './common';

export class POSIX extends Common {
    protected separator: string = '/';
    protected delimiter: string = ':';
    protected extensions: string[] = [''];

    normalizePath(path: string): string {
        return path.replace(/^file:\/\//, '').replace(/ /g, '\\ ');
    }
}
