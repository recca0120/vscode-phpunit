import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { injectable } from 'inversify';
import type { TestRun } from 'vscode';
import type { TestRunnerProcess } from '../PHPUnit';
import { CloverParser } from './CloverParser';

@injectable()
export class CoverageCollector {
    async collect(processes: TestRunnerProcess[], testRun: TestRun): Promise<void> {
        const cloverFiles = processes
            .map((process) => process.getCloverFile())
            .filter((file): file is string => !!file);

        await Promise.all(
            cloverFiles.map(async (file) => {
                for (const coverage of await CloverParser.parseClover(file)) {
                    testRun.addCoverage(coverage);
                }
            }),
        );

        const dirs = new Set(cloverFiles.map((file) => dirname(file)));
        await Promise.all([...dirs].map((dir) => rm(dir, { recursive: true, force: true })));
    }
}
