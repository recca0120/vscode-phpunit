import { describe, expect, it } from 'vitest';
import { checkFileExists, findAsyncSequential } from './files';

describe('files', () => {
    describe('checkFileExists', () => {
        it('should return true for existing file', async () => {
            expect(await checkFileExists(__filename)).toBe(true);
        });

        it('should return false for non-existing file', async () => {
            expect(await checkFileExists('/nonexistent/file.txt')).toBe(false);
        });
    });

    describe('findAsyncSequential', () => {
        it('should return first matching element', async () => {
            const result = await findAsyncSequential([1, 2, 3], async (n) => n === 2);
            expect(result).toBe(2);
        });

        it('should return undefined when no match', async () => {
            const result = await findAsyncSequential([1, 2, 3], async (n) => n === 5);
            expect(result).toBeUndefined();
        });
    });
});
