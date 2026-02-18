import {
    FileCoverage,
    type FileCoverageDetail,
    Position,
    StatementCoverage,
    TestCoverageCount,
    Uri,
} from 'vscode';
import type { FileCoverageData } from './PHPUnit/TestCoverage';

export class FileCoverageAdapter extends FileCoverage {
    constructor(private data: FileCoverageData) {
        super(Uri.file(data.filePath), new TestCoverageCount(data.covered, data.total));
    }

    public generateDetailedCoverage(): FileCoverageDetail[] {
        return this.data.lines.map(
            ({ line, count }) => new StatementCoverage(count, new Position(line - 1, 0)),
        );
    }
}
