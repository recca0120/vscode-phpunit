import { dirname, parse as pathParse, resolve as pathResolve } from 'path';
import { readFile, readFileSync, statSync, unlinkSync } from 'fs';

import { isWindows } from './helpers';
import { tmpdir } from 'os';

function existsSync(filePath) {
    try {
        statSync(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
    }

    return true;
}

function ensureArray(search: string[] | string): string[] {
    return search instanceof Array ? search : [search];
}

interface FilesystemInterface {
    find(search: string[] | string, cwd?: string): string;
    exists(search: string[] | string, cwd?: string): boolean;
    findUp(search: string[] | string, cwd?: string, root?: string): string;
}

class POSIX implements FilesystemInterface {
    protected systemPaths: string[] = process.env.PATH.split(/:/g).map(path => path.replace(/(:)$/, '').trim());
    protected extensions = [''];
    protected separator: string = '/';

    findUp(search: string[] | string, cwd: string = process.cwd(), root: string = ''): string {
        root = root === '' ? pathParse(cwd).root : pathResolve(root);

        let find = '';
        let parent = cwd;

        do {
            cwd = parent;

            find = this.findByPath(search, cwd);

            if (find) {
                return find;
            }

            parent = pathResolve(parent, '..');
        } while (parent !== root && parent !== cwd);

        return this.findBySystemPath(search);
    }

    find(search: string[] | string, cwd: string = process.cwd()): string {
        search = ensureArray(search);

        const find = this.findByPath(search, cwd);

        if (find) {
            return find;
        }

        return this.findBySystemPath(search);
    }

    exists(search: string[] | string, cwd: string = process.cwd()): boolean {
        search = ensureArray(search);

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

    protected findByPath(search: string[] | string, cwd: string = process.cwd()): string {
        search = ensureArray(search);

        for (const file of search) {
            for (const pwd of [`${cwd}${this.separator}`, '']) {
                for (const extension of this.extensions) {
                    const path = `${pwd}${file}${extension}`;

                    if (existsSync(path) === true) {
                        return pathResolve(path);
                    }
                }
            }
        }

        return '';
    }

    protected findBySystemPath(search: string[] | string): string {
        search = ensureArray(search);

        for (const systemPath of this.systemPaths) {
            const find = this.findByPath(search, systemPath);

            if (find) {
                return find;
            }
        }

        return '';
    }
}

class Windows extends POSIX {
    protected systemPaths: string[] = process.env.PATH.split(/;/g).map(path => path.replace(/(;)$/, '').trim());
    protected extensions = ['.bat', '.exe', '.cmd', ''];
    protected separator: string = '\\';
}

const instance = isWindows() ? new Windows() : new POSIX();

export const FilesystemCache = new Map<string, string>();

export class Filesystem implements FilesystemInterface {
    private instance: FilesystemInterface;

    private cache: Map<string, string>;

    constructor() {
        this.instance = instance;
        this.cache = FilesystemCache;
    }

    private key(search: string[]) {
        return JSON.stringify(search.join('-'));
    }

    findUp(search: string[] | string, cwd: string = process.cwd(), basePath: string = ''): string {
        search = ensureArray(search);

        const key = this.key(search.concat([cwd, basePath]));

        if (this.cache.has(key) === true) {
            return this.cache.get(key);
        }

        const find = this.instance.findUp(search, cwd, basePath);

        if (find) {
            this.cache.set(key, find);
        }

        return find;
    }

    find(search: string[] | string, cwd: string = process.cwd()): string {
        search = ensureArray(search);

        const key = this.key(search.concat([cwd]));

        if (this.cache.has(key) === true) {
            return this.cache.get(key);
        }

        const find = this.instance.find(search, cwd);

        if (find) {
            this.cache.set(key, find);
        }

        return find;
    }

    exists(search: string[] | string, cwd: string = process.cwd()): boolean {
        search = ensureArray(search);

        const key = `${this.key(search.concat([cwd]))}-exists`;

        if (this.cache.has(key) === true) {
            return true;
        }

        const exists = this.instance.exists(search, cwd);

        if (exists === true) {
            this.cache.set(key, '1');

            return true;
        }

        return false;
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

    get(path: string): string {
        return readFileSync(path).toString();
    }

    getAsync(path: string, encoding = 'utf8'): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(path, encoding, (error, data) => {
                return error ? reject(error) : resolve(data);
            });
        });
    }

    tmpfile(tmpname: string, dir: string = '') {
        return pathResolve(!dir ? tmpdir() : dir, tmpname);
    }

    isFile(path: string): boolean {
        return statSync(path).isFile();
    }

    dirname(path: string): string {
        return dirname(path);
    }
}
