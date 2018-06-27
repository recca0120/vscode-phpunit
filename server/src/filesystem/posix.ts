import { Filesystem } from './filesystem';
import { resolve as pathResolve, parse, dirname } from 'path';
import { readFile, stat } from 'fs';
import { tmpdir } from 'os';

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

    async where(search: string, currentDirectory: string = process.cwd()): Promise<string> {
        const paths: string[] = [currentDirectory].concat(this.systemPaths);

        for (const path of paths) {
            const file: string = await this.findFileByExtension(search, path);
            if (file) {
                return file;
            }
        }

        return '';
    }

    async which(search: string, currentDirectory: string = process.cwd()): Promise<string> {
        return this.where(search, currentDirectory);
    }

    exists(path: string): Promise<boolean> {
        return new Promise(resolve => {
            stat(this.normalizePath(path), err => {
                resolve(err && err.code === 'ENOENT' ? false : true);
            });
        });
    }

    async findUp(search: string, currentDirectory: string = process.cwd(), root?: string): Promise<string> {
        let file: string;
        root = pathResolve(!root ? parse(currentDirectory).root : root);
        currentDirectory = pathResolve(currentDirectory);

        do {
            file = await this.findFileByExtension(search, currentDirectory);

            if (file) {
                return file;
            }

            if (currentDirectory === root) {
                break;
            }

            currentDirectory = pathResolve(currentDirectory, '..');
        } while (currentDirectory !== root);

        file = pathResolve(currentDirectory, search);

        return (await this.exists(file)) === true ? file : '';
    }

    dirname(path: string) {
        return dirname(path);
    }

    tmpfile(extension: string = 'tmp', prefix?: string): string {
        prefix = prefix ? `${prefix}-` : '';

        return pathResolve(tmpdir(), `${prefix}${new Date().getTime()}.${extension}`);
    }

    get(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            return readFile(this.normalizePath(path), (err, buffer) => {
                err ? reject(err) : resolve(buffer.toString('utf8'));
            });
        });
    }

    private async findFileByExtension(search: string, currentDirectory: string = process.cwd()): Promise<string> {
        for (const ext of this.extensions) {
            const file = pathResolve(currentDirectory, `${search}${ext}`);
            if ((await this.exists(file)) === true) {
                return file;
            }
        }

        return '';
    }
}
