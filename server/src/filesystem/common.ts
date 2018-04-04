import { readFile, stat } from 'fs';
import { FilesystemContract } from './contract';
import { resolve as pathResolve, parse, dirname } from 'path';
import { tmpdir } from 'os';

export abstract class Common implements FilesystemContract {
    protected systemPaths: string[];
    protected delimiter: string;
    protected extensions: string[];

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
        let file: string;
        root = pathResolve(!root ? parse(cwd).root : root);
        cwd = pathResolve(cwd);

        do {
            file = pathResolve(cwd, search);
            if ((await this.exists(file)) === true) {
                return file;
            }

            if(cwd === root) {
                break;
            }

            cwd = pathResolve(cwd, '..');
        } while(cwd !== root)

        file = pathResolve(cwd, search);

        return (await this.exists(file)) === true ? file : '';
    }

    setSystemPaths(systemPaths: string): FilesystemContract {
        const delimiter = this.delimiter;
        this.systemPaths = systemPaths
            .split(new RegExp(delimiter, 'g'))
            .map((path: string) => path.replace(new RegExp(`${delimiter}$`, 'g'), '').trim());

        return this;
    }

    dirname(path: string): string {
        return dirname(path);
    }

    tmpfile(extension: string = 'tmp', prefix?: string): string {
        prefix = prefix ? `${prefix}-` : '';

        return pathResolve(tmpdir(), `${prefix}${new Date().getTime()}.${extension}`);
    }

    abstract normalizePath(path: string): string;
}
