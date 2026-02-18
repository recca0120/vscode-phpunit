import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { PathReplacer } from '../PathReplacer';
import type { CloverParser, FileCoverageData } from './CloverParser';

export class CoverageReader {
    private readonly cacheDir: string;
    private runId: string = randomUUID();

    constructor(
        cwd: string,
        private cloverParser: CloverParser,
        private pathReplacer: PathReplacer,
    ) {
        this.cacheDir = join(cwd, '.phpunit.cache');
    }

    generateCloverPath(index: number): string {
        return join(this.cacheDir, `coverage-${this.runId}-${index}.xml`);
    }

    async prepare(): Promise<void> {
        this.runId = randomUUID();
        await mkdir(this.cacheDir, { recursive: true });
    }

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
