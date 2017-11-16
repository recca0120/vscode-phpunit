import { readFile, readFileSync, statSync, unlinkSync } from 'fs';

import { isWindows } from './helpers';
import { resolve as pathResolve } from 'path';
import { tmpdir } from 'os';

function existsSync(filePath) {
    try {
        statSync(filePath);
    } catch (err) {
        console.error(err);
        if (err.code === 'ENOENT') {
            return false;
        }
    }
    return true;
}

interface FilesystemInterface {
    find(file: string): string;
    exists(file: string): boolean;
}

class POSIX implements FilesystemInterface {
    protected cwd: string = process.cwd();
    protected paths: string[] = process.env.PATH.split(/:|;/).map(path => path.replace(/(:|;)$/, '').trim());
    protected extensions = [''];
    protected separator: string = '/';

    find(file: string): string {
        const exists = this.getExists(file);
        if (exists) {
            return exists;
        }

        for (const path of this.paths) {
            const find = this.getExists(`${path}${this.separator}${file}`);
            if (find) {
                return pathResolve(find);
            }
        }

        return '';
    }

    exists(file: string): boolean {
        if (this.extensions.some(extension => existsSync(`${this.cwd}${this.separator}${file}${extension}`))) {
            return true;
        }

        return this.extensions.some(extension => existsSync(`${file}${extension}`));
    }

    protected normalize(buffer: Buffer) {
        return buffer
            .toString()
            .replace('/\r\n/', '\n')
            .split('\n')
            .shift()
            .trim();
    }

    protected getExists(file: string): string {
        for (const cwd of [`${this.cwd}\\`, '']) {
            for (const extension of this.extensions) {
                const path = `${cwd}${file}${extension}`;
                if (existsSync(path) === true) {
                    return pathResolve(path);
                }
            }
        }

        return '';
    }
}

class Windows extends POSIX {
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

    private key(files: string[]) {
        return JSON.stringify(files.join('-'));
    }

    find(search: string[] | string): string {
        const files = search instanceof Array ? search : [search];

        const key = this.key(files);
        if (this.cache.has(key) === true) {
            return this.cache.get(key);
        }

        for (const file of files) {
            const find = this.instance.find(file);
            if (find) {
                this.cache.set(key, find);

                return find;
            }
        }

        return '';
    }

    exists(search: string[] | string): boolean {
        const files = search instanceof Array ? search : [search];

        const key = `${this.key(files)}-exists`;
        if (this.cache.has(key) === true) {
            return true;
        }

        for (const file of files) {
            const exists = this.instance.exists(file);
            if (exists === true) {
                this.cache.set(key, file);
            }
            return exists;
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
}
