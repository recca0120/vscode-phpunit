import { access } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';

export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function findAsyncSequential<T>(
    array: T[],
    predicate: (t: T) => Promise<boolean>,
): Promise<T | undefined> {
    for (const t of array) {
        if (await predicate(t)) {
            return t;
        }
    }
    return undefined;
}

export const isInsideDirectory = (directory: string, path: string) => {
    const fromDirectory = relative(directory, path);
    return !fromDirectory.startsWith('..') && !isAbsolute(fromDirectory);
};
