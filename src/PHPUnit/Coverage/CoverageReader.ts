import { rm } from 'node:fs/promises';
import type { PathReplacer } from '../PathReplacer';
import type { CloverParser, FileCoverageData } from './CloverParser';

export class CoverageReader {
    constructor(
        private cloverParser: CloverParser,
        private pathReplacer: PathReplacer,
    ) {}

    async read(cloverFiles: string[]): Promise<FileCoverageData[]> {
        const results = await Promise.all(
            cloverFiles.map((file) => this.cloverParser.parseClover(file)),
        );

        await Promise.all(cloverFiles.map((file) => rm(file, { force: true })));

        return results
            .flat()
            .map((data) => ({ ...data, filePath: this.pathReplacer.toLocal(data.filePath) }));
    }
}
