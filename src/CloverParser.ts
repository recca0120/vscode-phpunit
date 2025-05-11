import { FileCoverage, FileCoverageDetail, Position, StatementCoverage, TestCoverageCount, Uri } from 'vscode';
import { Element } from './PHPUnit';


export class CloverParser {
    static async parseClover(file: string): Promise<PHPUnitFileCoverage[]> {
        try {
            const element = await Element.loadFile(file);

            return [
                ...element.querySelectorAll('coverage project file'),
                ...element.querySelectorAll('coverage project package file'),
            ].map((node: Element) => new PHPUnitFileCoverage(node));
        } catch (ex) {
            return [];
        }
    }
}

export class PHPUnitFileCoverage extends FileCoverage {
    constructor(private element: Element) {
        super(
            Uri.file(element.getAttribute('name')),
            new TestCoverageCount(0, 0),
        );
        const metrics = this.element.querySelector('metrics');
        this.statementCoverage.covered = parseInt(metrics?.getAttribute('coveredstatements'), 10);
        this.statementCoverage.total = parseInt(metrics?.getAttribute('statements'), 10);
    }

    public generateDetailedCoverage(): FileCoverageDetail[] {
        return this.element.querySelectorAll('line').map((line: Element) => {
            return new StatementCoverage(
                parseInt(line.getAttribute('count'), 10),
                new Position(parseInt(line.getAttribute('num'), 10) - 1, 0),
            );
        });
    }
}