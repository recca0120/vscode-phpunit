import { readFile, PathLike, writeFile, access } from 'fs';
import { join } from 'path';
import URI from 'vscode-uri';

export class Env {
    constructor(
        private _paths: string = process.env.PATH as string,
        public delimiter: string = Env.isWindows() ? ';' : ':',
        public extensions: string[] = Env.isWindows()
            ? ['.bat', '.exe', '.cmd', '']
            : ['']
    ) {}

    paths(): string[] {
        return this._paths
            .split(new RegExp(this.delimiter, 'g'))
            .map((path: string) =>
                path.replace(new RegExp(`${this.delimiter}$`, 'g'), '').trim()
            );
    }

    static isWindows(platform: string = process.platform) {
        return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(platform)
            ? true
            : false;
    }

    private static _instance = new Env();

    static instance() {
        return Env._instance;
    }
}

export class Filesystem {
    private paths: string[] = [];
    private extensions: string[] = [];

    constructor(env: Env = Env.instance()) {
        this.paths = env.paths();
        this.extensions = env.extensions;
    }

    get(uri: PathLike | URI): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(
                this.asUri(uri).fsPath,
                (err: NodeJS.ErrnoException, data: Buffer) =>
                    err ? reject(err) : resolve(data.toString())
            );
        });
    }

    put(uri: PathLike | URI, text: string): Promise<boolean> {
        return new Promise(resolve => {
            writeFile(
                this.asUri(uri).fsPath,
                text,
                (err: NodeJS.ErrnoException) => resolve(err ? false : true)
            );
        });
    }

    exists(uri: PathLike | URI): Promise<boolean> {
        return new Promise(resolve => {
            access(this.asUri(uri).fsPath, (err: NodeJS.ErrnoException) =>
                resolve(err ? false : true)
            );
        });
    }

    async which(
        search: string | string[],
        cwd: string = process.cwd()
    ): Promise<string> {
        search = search instanceof Array ? search : [search];

        for (let file of this.searchFile(search, [cwd].concat(this.paths))) {
            if (await this.exists(file)) {
                return file;
            }
        }
    }

    asUri(uri: PathLike | URI) {
        return URI.isUri(uri) ? uri : URI.parse(uri as string);
    }

    private *searchFile(search: string[], paths: string[]) {
        for (let path of paths) {
            for (let extension of this.extensions) {
                for (let value of search) {
                    yield join(path, `${value}${extension}`);
                }
            }
        }
    }
}

const files = new Filesystem();

export default files;
