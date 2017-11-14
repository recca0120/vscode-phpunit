import { accessSync, existsSync, readFile, readFileSync, unlinkSync } from 'fs';

import { isWindows } from './helpers';
import { resolve as pathResolve } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

interface FilesystemInterface {
    find(file: string): string;
    exists(file: string): boolean;
}

abstract class AbstractFilesystem {
    protected normalize(buffer: Buffer) {
        return buffer
            .toString()
            .replace('/\r\n/', '\n')
            .split('\n')
            .shift()
            .trim();
    }
}

class Windows extends AbstractFilesystem implements FilesystemInterface {
    private readonly extensions = ['.bat', '.exe', '.cmd', ''];

    find(file: string): string {
        const exists = this.getExists(file);
        if (exists) {
            return exists;
        }

        const paths = process.env.PATH.split(';');

        for (const path of paths) {
            const find = this.getExists(`${path}\\${file}`);
            if (find) {
                return find;
            }
        }

        return '';
    }

    exists(file: string): boolean {
        return this.extensions.some(extension => existsSync(`${file}${extension}`));
    }

    private getExists(file: string): string {
        for (const extension of this.extensions) {
            const path = `${file}${extension}`;
            if (existsSync(path) === true) {
                return pathResolve(path) || path;
            }
        }

        return '';
    }
}

class Unix extends AbstractFilesystem implements FilesystemInterface {
    find(fileName: string): string {
        return this.exists(fileName)
            ? pathResolve(fileName)
            : this.normalize(new Buffer(spawnSync('which', [fileName]).output.join('')));
    }

    exists(file: string): boolean {
        return existsSync(file);
    }
}

const instance = isWindows() ? new Windows() : new Unix();

export const FilesystemCache = new Map<string, string>();

export class Filesystem extends AbstractFilesystem {
    private instance: FilesystemInterface;

    private cache: Map<string, string>;

    constructor() {
        super();
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
                if (accessSync(file)) {
                    unlinkSync(file);
                } else {
                    setTimeout(() => {
                        this.unlink(file);
                    }, 500);
                }
            }
        } catch (e) {
            this.unlink(file);
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
