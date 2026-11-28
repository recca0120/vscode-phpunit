import type { FileCoverageData } from '@vscode-phpunit/phpunit';
import {
    DeclarationCoverage,
    FileCoverage,
    type FileCoverageDetail,
    Position,
    StatementCoverage,
    TestCoverageCount,
    Uri,
} from 'vscode';

export class FileCoverageAdapter extends FileCoverage {
    constructor(private data: FileCoverageData) {
        super(
            Uri.file(data.filePath),
            new TestCoverageCount(data.covered, data.total),
            undefined,
            data.methods && new TestCoverageCount(data.methods.covered, data.methods.total),
        );
    }

    public generateDetailedCoverage(): FileCoverageDetail[] {
        const declarations = this.data.methods?.declarations ?? [];
        const declarationLines = new Set(declarations.map(({ line }) => line));

        return [
            ...this.data.lines
                .filter(({ line }) => !declarationLines.has(line))
                .map(({ line, count }) => new StatementCoverage(count, new Position(line - 1, 0))),
            ...declarations.map(
                ({ name, line, count }) =>
                    new DeclarationCoverage(name, count, new Position(line - 1, 0)),
            ),
        ];
    }
}
