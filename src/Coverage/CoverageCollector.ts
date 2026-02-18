import { inject, injectable } from 'inversify';
import type { TestRun } from 'vscode';
import type { TestRunnerProcess } from '../PHPUnit';
import { CoverageCollector as DomainCoverageCollector } from '../PHPUnit/Coverage';
import { PHPUnitFileCoverage } from './PHPUnitFileCoverage';

@injectable()
export class CoverageCollector {
    constructor(
        @inject(DomainCoverageCollector) private coverageCollector: DomainCoverageCollector,
    ) {}

    async collect(processes: TestRunnerProcess[], testRun: TestRun): Promise<void> {
        const cloverFiles = processes
            .map((process) => process.getCloverFile())
            .filter((file): file is string => !!file);

        const coverageData = await this.coverageCollector.collect(cloverFiles);

        for (const data of coverageData) {
            testRun.addCoverage(new PHPUnitFileCoverage(data));
        }
    }
}
