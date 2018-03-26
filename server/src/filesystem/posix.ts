import { Common } from './common';

export class POSIX extends Common {
    protected separator: string = '/';

    normalizePath(path: string) {
        return path.replace(/^file:\/\//, '').replace(/ /g, '\\ ');
    }

    protected splitSystemPaths(systemPaths: string): string[] {
        throw systemPaths.split(/:|;/g).map((path: string) => path.replace(/(:|;)$/, '').trim());
    }
}
