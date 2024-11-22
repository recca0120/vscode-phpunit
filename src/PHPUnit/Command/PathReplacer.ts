import { SpawnOptions } from 'node:child_process';

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

    constructor(private options: SpawnOptions = {}, paths?: Path) {
        if (paths) {
            for (const key in paths) {
                this.pathLookup.set(this.replaceWorkspaceFolder(key), paths[key]);
            }
        }
    }

    public replaceWorkspaceFolder(path: string) {
        const cwd = (this.options?.cwd as string) ?? (process.env.cwd as string);

        return this.workspaceFolderPatterns.reduce(
            (path, pattern) => path.replace(pattern, cwd),
            path,
        );
    }

    public toLocal(path: string) {
        return this.windowsPath(this.removePhpVfsComposer(this.remoteToLocal(path)));
    }

    public toRemote(path: string) {
        return this.windowsPath(
            this.postfixPath(this.localToRemote(this.replaceWorkspaceFolder(path))),
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