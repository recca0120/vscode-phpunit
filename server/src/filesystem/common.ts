import { readFile, stat } from 'fs';
import { FilesystemContract } from './contract';
import { resolve as pathResolve, parse } from 'path';

export abstract class Common implements FilesystemContract {
    protected systemPaths: string[];
    protected extensions: string[] = [''];

    constructor() {
        this.setSystemPaths(process.env.PATH as string);
    }

    exists(path: string): Promise<boolean> {
        return new Promise(resolve => {
            stat(this.normalizePath(path), err => {
                resolve(err && err.code === 'ENOENT' ? false : true);
            });
        });
    }

    get(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            return readFile(this.normalizePath(path), (err, buffer) => {
                err ? reject(err) : resolve(buffer.toString('utf8'));
            });
        });
    }

    getSystemPaths(): string[] {
        return this.systemPaths;
    }

    async where(search: string, cwd: string = process.cwd()): Promise<string> {
        const paths: string[] = [cwd].concat(this.getSystemPaths());
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

    async findUp(search: string, cwd: string = process.cwd(), root?: string): Promise<string> {
        root = !root ? parse(cwd).root : root;

        if (cwd === root) {
            return '';
        }

        const file = pathResolve(cwd, search);

        return (await this.exists(file)) === true ? file : await this.findUp(search, pathResolve(cwd, '..'), root);
    }

    abstract setSystemPaths(systemPaths: string): FilesystemContract;

    abstract normalizePath(path: string): string;
}
