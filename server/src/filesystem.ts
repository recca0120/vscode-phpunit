import { readFile, PathLike, writeFile } from 'fs';
import URI from 'vscode-uri';

export class Filesystem {
    get(uri: PathLike | URI): Promise<string> {
        return new Promise((resolve, reject) => {
            readFile(
                this.asUri(uri).fsPath,
                (err: NodeJS.ErrnoException, data: Buffer) => {
                    err ? reject(err) : resolve(data.toString());
                }
            );
        });
    }

    put(uri: PathLike | URI, text: string): Promise<boolean> {
        return new Promise(resolve => {
            writeFile(
                this.asUri(uri).fsPath,
                text,
                (err: NodeJS.ErrnoException) => {
                    resolve(err ? false : true);
                }
            );
        });
    }

    asUri(uri: PathLike | URI) {
        return URI.isUri(uri) ? uri : URI.parse(uri as string);
    }

    private static _instance = new Filesystem();

    static instance() {
        return Filesystem._instance;
    }
}
