import { access } from 'node:fs/promises';

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
