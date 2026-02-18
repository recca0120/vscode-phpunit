import { rm } from 'node:fs/promises';
import { inject, injectable } from 'inversify';
import type { TestRun } from 'vscode';
import type { TestRunnerProcess } from '../PHPUnit';
import { CloverParser } from '../PHPUnit/Coverage';
import { PHPUnitFileCoverage } from './PHPUnitFileCoverage';

@injectable()
export class CoverageCollector {
    constructor(@inject(CloverParser) private cloverParser: CloverParser) {}

    async collect(processes: TestRunnerProcess[], testRun: TestRun): Promise<void> {
        const cloverFiles = processes
            .map((process) => process.getCloverFile())
            .filter((file): file is string => !!file);

        await Promise.all(
            cloverFiles.map(async (file) => {
                for (const data of await this.cloverParser.parseClover(file)) {
                    testRun.addCoverage(new PHPUnitFileCoverage(data));
                }
            }),
        );

        await Promise.all(cloverFiles.map((file) => rm(file, { force: true })));
    }
}
