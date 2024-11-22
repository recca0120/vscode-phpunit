import { SpawnOptions } from 'node:child_process';

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export type Path = { [p: string]: string };

export class PathReplacer {
    private workspaceFolderPatterns = ['${PWD}', '${workspaceFolder}'].map((pattern) => {
        return new RegExp(
            pattern.replace(/[${}]/g, (matched) => {
                return `\\${matched}` + (['{', '}'].includes(matched) ? '?' : '');
            }),
            'g',
        );
    });

    private pathLookup = new Map<string, string>();
    private readonly cwd: string;
    private pathVariables: Map<string, string>;

    constructor(private options: SpawnOptions = {}, paths?: Path) {
        this.cwd = (this.options?.cwd as string) ?? (process.env.cwd as string);
        this.pathVariables = new Map<string, string>();
        this.pathVariables.set('${PWD}', this.cwd);
        this.pathVariables.set('${workspaceFolder}', this.cwd);
        for (const [key, value] of Object.entries(paths ?? {})) {
            this.pathVariables.has(key)
                ? this.pathLookup.set(this.pathVariables.get(key)!, value)
                : this.pathLookup.set(key, value);
        }
    }

    replacePathVariables(path: string) {
        for (const [key, value] of this.pathVariables) {
            path = path.replace(new RegExp(escapeRegExp(key), 'g'), value);
        }

        return path;
    }

    toLocal(path: string) {
        return this.windowsPath(this.removePhpVfsComposer(this.remoteToLocal(path)));
    }

    toRemote(path: string) {
        return this.windowsPath(
            this.postfixPath(this.localToRemote(this.replacePathVariables(path))),
        );
    }

    private remoteToLocal(path: string) {
        return this.replacePaths(path, (localPath, remotePath) => {
            return path.replace(
                new RegExp(`${remotePath === '.' ? `\\${remotePath}` : remotePath}(\/)`, 'g'),
                (_m, sep) => `${localPath}${sep}`,
            );
        });
    }

    private localToRemote(path: string) {
        return this.replacePaths(path, (localPath, remotePath) =>
            path.replace(localPath, remotePath),
        );
    }

    private postfixPath(path: string) {
        return path.replace(/\\/g, '/');
    }

    private windowsPath(path: string) {
        return path
            .replace(/php_qn:\/\//g, 'php_qn:||')
            .replace(/\w:[\\\/][^:]+/g, (matched) => matched.replace(/\//g, '\\'))
            .replace(/php_qn:\|\|/g, 'php_qn://');
    }

    private removePhpVfsComposer(path: string) {
        return path.replace(/phpvfscomposer:\/\//g, '');
    }

    private replacePaths(path: string, fn: (remotePath: string, localPath: string) => string) {
        if (this.pathLookup.size === 0) {
            return path;
        }

        this.pathLookup.forEach(
            (remotePath: string, localPath: string) => (path = fn(localPath, remotePath)),
        );

        return path;
    }
}