import { Filesystem } from './filesystem';
import { resolve as pathResolve } from 'path';
import { stat } from 'fs';

export class POSIX implements Filesystem {
    protected systemPaths: string[] = [];
    protected separator: string = '/';
    protected delimiter: string = ':';
    protected extensions: string[] = [''];

    constructor() {
        this.setSystemPaths(process.env.PATH as string);
    }

    normalizePath(path: string): string {
        return path.replace(/^file:\/\//, '').replace(/ /g, '\\ ');
    }

    setSystemPaths(systemPaths: string): Filesystem {
        this.systemPaths = systemPaths
            .split(new RegExp(this.delimiter, 'g'))
            .map((path: string) => path.replace(new RegExp(`${this.delimiter}$`, 'g'), '').trim());

        return this;
    }

    async where(search: string, cwd: string = process.cwd()): Promise<string> {
        const paths: string[] = [cwd].concat(this.systemPaths);
        const extensions = this.extensions;
        for (const path of paths) {
            for (const ext of extensions) {
                const file = pathResolve(path, `${search}${ext}`);
                if ((await this.exists(file)) === true) {
                    return file;
                }
            }
        }

        return '';
    }

    async which(search: string, cwd: string = process.cwd()): Promise<string> {
        return this.where(search, cwd);
    }

    exists(path: string): Promise<boolean> {
        return new Promise(resolve => {
            stat(this.normalizePath(path), err => {
                resolve(err && err.code === 'ENOENT' ? false : true);
            });
        });
    }
}
