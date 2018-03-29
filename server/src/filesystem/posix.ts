import { Common } from './common';
import { FilesystemContract } from './contract';

export class POSIX extends Common {
    protected separator: string = '/';

    normalizePath(path: string): string {
        return path.replace(/^file:\/\//, '').replace(/ /g, '\\ ');
    }

    setSystemPaths(systemPaths: string): FilesystemContract {
        this.systemPaths = systemPaths.split(/:|;/g).map((path: string) => path.replace(/(:|;)$/, '').trim());

        return this;
    }
}
