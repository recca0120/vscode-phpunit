import type { PathMapper } from './PathMapper';

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PathMapping {
    local: string;
    remote: string;
}

export class PrefixPathMapper implements PathMapper {
    constructor(
        private readonly mappings: PathMapping[],
        private readonly cwd: string,
    ) {}

    toLocal(path: string) {
        path = this.removePhpVfsComposer(path);

        const { prefix, pathPart, suffix } = this.splitQualifiedName(path);

        let result = pathPart;
        for (const { local, remote } of this.mappings) {
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
        path = this.expandRelative(path);

        for (const { local, remote } of this.mappings) {
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
        const match = path.match(/^((?:php_qn|pest_qn|file):\/\/)?(.*?)(?=::|$)(::.*)?$/);
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
        return path.replace(/(?<![\w])[a-zA-Z]:(?=[\\/]|$)[^:]*/g, (path) =>
            path.replace(/\//g, '\\'),
        );
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

    private isSafePath(path: string) {
        return !['/', '', ' '].includes(path);
    }
}
