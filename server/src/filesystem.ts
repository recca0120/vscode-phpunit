import { readFile, PathLike } from 'fs';
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

    asUri(uri: PathLike | URI) {
        return URI.isUri(uri) ? uri : URI.parse(uri as string);
    }

    private static instance = new Filesystem();

    static create() {
        return Filesystem.instance;
    }
}
