import type { SpawnOptions } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
    VAR_PATH_SEPARATOR,
    VAR_PATH_SEPARATOR_SHORT,
    VAR_PWD,
    VAR_USER_HOME,
    VAR_WORKSPACE_FOLDER,
    VAR_WORKSPACE_FOLDER_BASENAME,
} from './constants';

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type Path = { [p: string]: string };

interface PathMapping {
    local: string;
    remote: string;
}

export class PathReplacer {
    private readonly cwd: string;
    private readonly pathVariables: Map<string, string>;
    private readonly pathMappings: PathMapping[] = [];

    constructor(
        private options: SpawnOptions = {},
        paths?: Path,
    ) {
        this.cwd = this.normalizePath((this.options?.cwd as string) ?? (process.env.cwd as string));
        this.pathVariables = new Map<string, string>();
        this.pathVariables.set(VAR_PWD, this.cwd);
        this.pathVariables.set(VAR_WORKSPACE_FOLDER, this.cwd);
        this.pathVariables.set(
            VAR_WORKSPACE_FOLDER_BASENAME,
            this.cwd ? path.basename(this.cwd) : '',
        );
        this.pathVariables.set(VAR_USER_HOME, os.homedir());
        this.pathVariables.set(VAR_PATH_SEPARATOR, path.sep);
        this.pathVariables.set(VAR_PATH_SEPARATOR_SHORT, path.sep);
        for (const [key, value] of Object.entries(paths ?? {})) {
            const remote = this.replacePathVariables(value);
            if (!this.pathVariables.has(key)) {
                this.pathMappings.push({ local: key, remote });
                continue;
            }

            const local = this.pathVariables.get(key);
            if (local) {
                this.pathMappings.push({ local, remote });
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
        path = this.removePhpVfsComposer(path);

        const { prefix, pathPart, suffix } = this.splitQualifiedName(path);

        let result = pathPart;
        for (const { local, remote } of this.pathMappings) {
            if (!this.isSafePath(local) || remote === '.') {
                continue;
            }

            result = result.replace(new RegExp(escapeRegExp(remote), 'g'), local);
        }

        result = this.expandRelative(result);
        result = this.normalizeToWindows(result);

        return `${prefix}${result}${suffix}`;
    }

    toRemote(path: string) {
        path = this.replacePathVariables(path);

        path = this.expandRelative(path);

        for (const { local, remote } of this.pathMappings) {
            if (!this.isSafePath(local)) {
                continue;
            }
            path = path.replace(new RegExp(escapeRegExp(local), 'g'), remote);
        }

        path = this.normalizeToPosix(path);
        path = this.normalizeToWindows(path);

        return path;
    }

    private splitQualifiedName(path: string): {
        prefix: string;
        pathPart: string;
        suffix: string;
    } {
        const match = path.match(/^(php_qn:\/\/)?(.*?)(?=::|$)(::.*)?$/);
        if (!match) {
            return { prefix: '', pathPart: path, suffix: '' };
        }

        return {
            prefix: match[1] ?? '',
            pathPart: match[2],
            suffix: match[3] ?? '',
        };
    }

    private normalizeToPosix(path: string) {
        return !/^[a-zA-Z]:/.test(path) && path.indexOf('\\') !== -1
            ? path.replace(/\\/g, '/')
            : path;
    }

    private normalizeToWindows(path: string) {
        return /[a-zA-Z]:/.test(path)
            ? path.replace(/[a-zA-Z]:[^:]+/g, (path) => path.replace(/\//g, '\\'))
            : path;
    }

    private expandRelative(path: string) {
        if (!path.startsWith('./')) {
            return path;
        }

        return this.cwd ? path.replace(/^\./, this.cwd) : path;
    }

    private removePhpVfsComposer(path: string) {
        return path.replace(/phpvfscomposer:\/\//gi, '');
    }

    private normalizePath(path: string) {
        return /^\\/.test(path) ? `c:${path}` : path;
    }

    private isSafePath(path: string) {
        return !['/', '', ' '].includes(path);
    }
}
