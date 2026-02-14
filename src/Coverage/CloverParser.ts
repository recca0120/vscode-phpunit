import {
    FileCoverage,
    type FileCoverageDetail,
    Position,
    StatementCoverage,
    TestCoverageCount,
    Uri,
} from 'vscode';
import { XmlElement } from '../PHPUnit';

export class CloverParser {
    static async parseClover(file: string): Promise<PHPUnitFileCoverage[]> {
        try {
            const element = await XmlElement.loadFile(file);

            return [
                ...element.querySelectorAll('coverage project file'),
                ...element.querySelectorAll('coverage project package file'),
            ].map((node: XmlElement) => new PHPUnitFileCoverage(node));
        } catch (_ex) {
            return [];
        }
    }
}

export class PHPUnitFileCoverage extends FileCoverage {
    constructor(private element: XmlElement) {
        super(Uri.file(element.getAttribute('name')!), new TestCoverageCount(0, 0));
        const metrics = this.element.querySelector('metrics');
        this.statementCoverage.covered = parseInt(metrics?.getAttribute('coveredstatements')!, 10);
        this.statementCoverage.total = parseInt(metrics?.getAttribute('statements')!, 10);
    }

    public generateDetailedCoverage(): FileCoverageDetail[] {
        return this.element.querySelectorAll('line').map((line: XmlElement) => {
            return new StatementCoverage(
                parseInt(line.getAttribute('count')!, 10),
                new Position(parseInt(line.getAttribute('num')!, 10) - 1, 0),
            );
        });
    }
}
