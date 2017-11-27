import { dirname, parse as pathParse, resolve as pathResolve } from 'path';
import { isWindows, tap } from './helpers';
import { readFile, readFileSync, statSync, unlinkSync } from 'fs';

import { tmpdir } from 'os';

function existsSync(filePath: string) {
    try {
        statSync(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
    }

    return true;
}

export interface FilesystemInterface {
    find(search: string[] | string, opts?: {}): string;
    exists(search: string[] | string, opts?: {}): boolean;
    findUp(search: string[] | string, opts?: {}): string;
    get(path: string): string;
    getAsync(path: string, encoding?: string): Promise<string>;
    unlink(file: string): void;
    tmpfile(tmpname: string, dir?: string): string;
    isFile(path: string): boolean;
    dirname(path: string): string;
}

export abstract class AbstractFilesystem {
    get(path: string): string {
        return readFileSync(path).toString();
    }

    getAsync(path: string, encoding: string = 'utf8'): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(path, encoding, (error, data) => {
                return error ? reject(error) : resolve(data);
            });
        });
    }

    unlink(file: string): void {
        try {
            if (existsSync(file) === true) {
                unlinkSync(file);
            }
        } catch (e) {
            setTimeout(() => {
                this.unlink(file);
            }, 500);
        }
    }

    tmpfile(tmpname: string, dir: string = ''): string {
        return pathResolve(!dir ? tmpdir() : dir, tmpname);
    }

    isFile(path: string): boolean {
        return statSync(path).isFile();
    }

    dirname(path: string): string {
        return dirname(path);
    }

    protected ensureArray(search: string[] | string): string[] {
        return search instanceof Array ? search : [search];
    }
}

class POSIX extends AbstractFilesystem implements FilesystemInterface {
    protected systemPaths: string[] = process.env.PATH.split(/:|;/g).map((path: string) =>
        path.replace(/(:|;)$/, '').trim()
    );
    protected extensions = [''];
    protected separator: string = '/';

    findUp(search: string[] | string, opts: any = {}): string {
        let cwd = opts.cwd || process.cwd();
        const root = pathParse(cwd).root;
        // const basePath = opts.basePath ? pathResolve(opts.basePath) : root;

        do {
            const find = this.usePath(search, {
                cwd: cwd,
            });

            if (find) {
                return find;
            }

            cwd = pathResolve(cwd, '..');
        } while (root !== cwd);

        return this.find(search, {
            cwd: root,
        });
    }

    find(search: string[] | string, opts: any = {}): string {
        search = this.ensureArray(search);
        const cwd = opts.cwd || process.cwd();

        return this.usePath(search, cwd) || this.useSystemPath(search);
    }

    exists(search: string[] | string, opts: any = {}): boolean {
        search = this.ensureArray(search);
        const cwd = opts.cwd || process.cwd();

        for (const file of search) {
            if (
                this.extensions.some(extension => existsSync(`${cwd}${this.separator}${file}${extension}`)) ||
                this.extensions.some(extension => existsSync(`${file}${extension}`))
            ) {
                return true;
            }
        }

        return false;
    }

    protected usePath(search: string[] | string, opts: any = {}): string {
        search = this.ensureArray(search);
        const cwd = opts.cwd || process.cwd();

        for (const file of search) {
            for (const pwd of [`${cwd}${this.separator}`, '']) {
                for (const extension of this.extensions) {
                    const path = `${pwd}${file}${extension}`;

                    if (existsSync(path) === true && this.isFile(path)) {
                        return pathResolve(path);
                    }
                }
            }
        }

        return '';
    }

    protected useSystemPath(search: string[] | string): string {
        search = this.ensureArray(search);

        for (const systemPath of this.systemPaths) {
            const find = this.usePath(search, {
                cwd: systemPath,
            });

            if (find) {
                return find;
            }
        }

        return '';
    }
}

class Windows extends POSIX {
    protected systemPaths: string[] = process.env.PATH.split(/;/g).map((path: string) =>
        path.replace(/(;)$/, '').trim()
    );
    protected extensions = ['.bat', '.exe', '.cmd', ''];
    protected separator: string = '\\';
}

export class Filesystem extends AbstractFilesystem implements FilesystemInterface {
    constructor(private files: FilesystemInterface = isWindows() ? new Windows() : new POSIX()) {
        super();
    }

    findUp(search: string[] | string, opts: any = {}): string {
        return this.files.findUp(search, opts);
    }

    find(search: string[] | string, opts: any = {}): string {
        return this.files.find(search, opts);
    }

    exists(search: string[] | string, opts: any = {}): boolean {
        return this.files.exists(search, opts);
    }
}

const FilesystemCache = new Map<string, string>();

export class CachableFilesystem extends Filesystem {
    private cache: Map<string, string> = FilesystemCache;

    findUp(search: string[] | string, opts: any = {}): string {
        const cwd = opts.cwd || process.cwd();
        const basePath = opts.basePath || '';
        const key = this.key(search, [cwd, basePath]);

        return this.cache.has(key) === true
            ? this.cache.get(key)
            : tap(super.findUp(search, opts), (find: string) => this.cache.set(key, find));
    }

    find(search: string[] | string, opts: any = {}): string {
        const cwd = opts.cwd || process.cwd();
        const key = this.key(search, [cwd]);

        return this.cache.has(key) === true
            ? this.cache.get(key)
            : tap(super.find(search, cwd), (find: string) => this.cache.set(key, find));
    }

    exists(search: string[] | string, opts: any = {}): boolean {
        const cwd = opts.cwd || process.cwd();
        const key = this.key(search, [cwd, 'exists']);

        return this.cache.has(key) === true
            ? this.cache.get(key)
            : tap(super.exists(search, cwd), (find: string) => this.cache.set(key, find));
    }

    private key(search: string[] | string, opts: string[] = []) {
        return JSON.stringify(
            this.ensureArray(search)
                .concat(opts)
                .join('-')
        );
    }
}
