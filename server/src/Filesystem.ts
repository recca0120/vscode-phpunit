import { readFile, PathLike, writeFile, access, createReadStream } from 'fs';
import { join, dirname } from 'path';
import URI from 'vscode-uri';
import { createInterface } from 'readline';
import { Position, Range, Location } from 'vscode-languageserver-protocol';

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

    dirname(uri: PathLike | URI): string {
        return dirname(this.asUri(uri).fsPath);
    }

    async find(
        search: string | string[],
        paths: string[] = []
    ): Promise<string> {
        for (let file of this.searchFile(search, paths.concat(this.paths))) {
            if (await this.exists(file)) {
                return file;
            }
        }
    }

    async which(
        search: string | string[],
        cwd: string = process.cwd()
    ): Promise<string> {
        return await this.find(search, [cwd]);
    }

    async findup(search: string | string[], cwd: string = process.cwd()) {
        const paths = [cwd];

        do {
            const current = paths[paths.length - 1];
            const parent = this.dirname(current);

            if (current === parent) {
                break;
            }
            paths.push(parent);
        } while (true);

        return await this.find(search, [cwd].concat(paths));
    }

    asUri(uri: PathLike | URI): URI {
        return URI.isUri(uri)
            ? uri
            : URI.parse(
                  (uri as string).replace(/\\/g, '/').replace(/^(\w):/i, m => {
                      return `/${m[0].toLowerCase()}%3A`;
                  })
              ).with({ scheme: 'file' });
    }

    lineAt(uri: PathLike | URI, lineNumber: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const rl = createInterface({
                input: createReadStream(this.asUri(uri).fsPath),
                crlfDelay: Infinity,
            });

            let current = 0;
            let found = false;
            rl.on('line', line => {
                if (lineNumber === current) {
                    found = true;
                    rl.close();
                    resolve(line);
                }

                current++;
            });

            rl.on('close', () => {
                if (found === false) {
                    reject('');
                }
            });
        });
    }

    async lineRange(uri: PathLike | URI, lineNumber: number): Promise<Range> {
        const line = await this.lineAt(uri, lineNumber);

        return Range.create(
            Position.create(lineNumber, line.search(/\S|$/)),
            Position.create(lineNumber, line.replace(/\s+$/, '').length)
        );
    }

    async lineLocation(
        uri: PathLike | URI,
        lineNumber: number
    ): Promise<Location> {
        uri = this.asUri(uri).with({ scheme: 'file' });

        return Location.create(
            uri.toString(),
            await this.lineRange(uri, lineNumber)
        );
    }

    private *searchFile(search: string[] | string, paths: string[]) {
        search = search instanceof Array ? search : [search];

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
