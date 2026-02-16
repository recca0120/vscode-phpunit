import type { SpawnOptions } from 'node:child_process';
import { VAR_PWD, VAR_WORKSPACE_FOLDER } from './placeholders';

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export type Path = { [p: string]: string };

export class PathReplacer {
    private readonly cwd: string;
    private readonly pathVariables: Map<string, string>;
    private pathLookup = new Map<string, string>();

    constructor(
        private options: SpawnOptions = {},
        paths?: Path,
    ) {
        this.cwd = this.normalizePath((this.options?.cwd as string) ?? (process.env.cwd as string));
        this.pathVariables = new Map<string, string>();
        this.pathVariables.set(VAR_PWD, this.cwd);
        this.pathVariables.set(VAR_WORKSPACE_FOLDER, this.cwd);
        for (const [key, value] of Object.entries(paths ?? {})) {
            if (this.pathVariables.has(key)) {
                const pathValue = this.pathVariables.get(key);
                if (pathValue) {
                    this.pathLookup.set(pathValue, value);
                }
            } else {
                this.pathLookup.set(key, value);
            }
        }
    }

    replacePathVariables(path: string) {
        for (const [key, value] of this.pathVariables) {
            path = path.replace(new RegExp(escapeRegExp(key), 'g'), value);
        }

        return path;
    }

    toLocal(path: string) {
        return this.removePhpVfsComposer(path).replace(
            /(php_qn:\/\/|)([^:]+)/,
            (_, prefix, path) => {
                path = this.replacePaths(path, (currentPath, localPath, remotePath) => {
                    return this.allowReplacement(localPath)
                        ? currentPath.replace(
                              new RegExp(
                                  remotePath === '.' ? '.[\\\\/]/' : escapeRegExp(remotePath),
                                  'g',
                              ),
                              localPath,
                          )
                        : currentPath;
                });

                path = this.replaceRelative(path);
                path = this.windowsPath(path);

                return `${prefix}${path}`;
            },
        );
    }

    toRemote(path: string) {
        path = this.replacePathVariables(path);

        path = this.replaceRelative(path);

        path = this.replacePaths(path, (currentPath, localPath, remotePath) => {
            return this.allowReplacement(localPath)
                ? currentPath.replace(new RegExp(escapeRegExp(localPath), 'g'), remotePath)
                : currentPath;
        });

        path = this.posixPath(path);
        path = this.windowsPath(path);

        return path;
    }

    private posixPath(path: string) {
        return !/^[a-zA-Z]:/.test(path) && path.indexOf('\\') !== -1
            ? path.replace(/\\/g, '/')
            : path;
    }

    private windowsPath(path: string) {
        return /[a-zA-Z]:/.test(path)
            ? path.replace(/[a-zA-Z]:[^:]+/g, (path) => path.replace(/\//g, '\\'))
            : path;
    }

    private replaceRelative(path: string) {
        if (!path.startsWith('./')) {
            return path;
        }

        const workspaceFolder = this.pathVariables.get(VAR_WORKSPACE_FOLDER);
        return workspaceFolder ? path.replace(/^\./, workspaceFolder) : path;
    }

    private removePhpVfsComposer(path: string) {
        return path.replace(/phpvfscomposer:\/\//gi, '');
    }

    private replacePaths(
        path: string,
        fn: (currentPath: string, remotePath: string, localPath: string) => string,
    ) {
        return Array.from(this.pathLookup.entries()).reduce((result, [remotePath, localPath]) => {
            return fn(result, remotePath, localPath);
        }, path);
    }

    private normalizePath(path: string) {
        // fix windows path \Users\ -> c:\Users
        return /^\\/.test(path) ? `c:${path}` : path;
    }

    private allowReplacement(path: string) {
        return !['/', '', ' '].includes(path);
    }
}
