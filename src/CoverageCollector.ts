import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { TestRun } from 'vscode';
import { CloverParser } from './CloverParser';
import type { TestRunnerProcess } from './PHPUnit';

export class CoverageCollector {
    async collect(processes: TestRunnerProcess[], testRun: TestRun): Promise<void> {
        const cloverFiles = processes
            .map((process) => process.getCloverFile())
            .filter((file): file is string => !!file);

        await Promise.all(
            cloverFiles.map(async (file) => {
                (await CloverParser.parseClover(file)).forEach((coverage) => {
                    testRun.addCoverage(coverage);
                });
            }),
        );

        if (cloverFiles.length > 0) {
            await rm(dirname(cloverFiles[0]), { recursive: true, force: true });
        }
    }
}
