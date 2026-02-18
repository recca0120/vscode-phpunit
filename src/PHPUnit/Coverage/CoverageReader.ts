import { rm } from 'node:fs/promises';
import type { CloverParser, FileCoverageData } from './CloverParser';

export class CoverageReader {
    constructor(private cloverParser: CloverParser) {}

    async read(cloverFiles: string[]): Promise<FileCoverageData[]> {
        const results = await Promise.all(
            cloverFiles.map((file) => this.cloverParser.parseClover(file)),
        );

        await Promise.all(cloverFiles.map((file) => rm(file, { force: true })));

        return results.flat();
    }
}
