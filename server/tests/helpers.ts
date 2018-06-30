import { resolve } from 'path';

export function fileUrl(path: string): string {
    return path.replace(/\\/g, '/').replace(/^(\w):/i, m => {
        return `file:///${m[0].toLowerCase()}%3A`;
    });
}

export function letterDriveLowerCase(path: string) {
    return path.replace(/^(\w):/i, m => {
        return `${m[0].toLowerCase()}:`;
    });
}

export function fixturePath(path: string = ''): string {
    return letterDriveLowerCase(resolve(__dirname, 'fixtures', path));
}

export function projectPath(path: string = ''): string {
    return letterDriveLowerCase(resolve(__dirname, 'fixtures/project', path));
}
