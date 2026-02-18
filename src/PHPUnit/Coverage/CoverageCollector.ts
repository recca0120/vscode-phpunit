import { rm } from 'node:fs/promises';
import { inject, injectable } from 'inversify';
import { CloverParser, type FileCoverageData } from './CloverParser';

@injectable()
export class CoverageCollector {
    constructor(@inject(CloverParser) private cloverParser: CloverParser) {}

    async collect(cloverFiles: string[]): Promise<FileCoverageData[]> {
        const results = await Promise.all(
            cloverFiles.map((file) => this.cloverParser.parseClover(file)),
        );

        await Promise.all(cloverFiles.map((file) => rm(file, { force: true })));

        return results.flat();
    }
}
