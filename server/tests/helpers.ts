import { resolve } from 'path';

export function fileUrl(path: string): string {
    return path.replace(/\\/g, '/').replace(/^(\w):/i, m => {
        return `file:///${m[0].toLowerCase()}%3A`;
    });
}

export function fixturePath(path: string = ''): string {
    return resolve(__dirname, 'fixtures', path);
}

export function projectPath(path: string = ''): string {
    return resolve(__dirname, 'fixtures/project', path);
}
