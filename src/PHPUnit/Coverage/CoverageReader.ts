import { rm } from 'node:fs/promises';
import type { PathReplacer } from '../PathReplacer';
import type { CloverParser, FileCoverageData } from './CloverParser';

export class CoverageReader {
    constructor(
        private cloverParser: CloverParser,
        private pathReplacer?: PathReplacer,
    ) {}

    async read(cloverFiles: string[]): Promise<FileCoverageData[]> {
        const results = await Promise.all(
            cloverFiles.map((file) => this.cloverParser.parseClover(file)),
        );

        await Promise.all(cloverFiles.map((file) => rm(file, { force: true })));

        const toLocal = this.pathReplacer;
        return results
            .flat()
            .map((data) =>
                toLocal ? { ...data, filePath: toLocal.toLocal(data.filePath) } : data,
            );
    }
}
