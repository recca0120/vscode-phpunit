import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';


export class CloverParser
{
    public static ensureArray(obj: any) {
        return Array.isArray(obj) ? obj : [obj];
    }

    static async parseClover(file:string): Promise<PHPUnitFileCoverage[]> {

        try {
            const xml = await fs.readFile(file);

            const parser = new XMLParser({
                ignoreAttributes: false, // Don't ignore attributes
                attributeNamePrefix: '@_', // Prefix for attributes
                trimValues: true,
            });

            const clover = parser.parse(xml);

            const ret = [];

            if (clover.coverage?.project?.file) {
                for (const cloverFile of CloverParser.ensureArray(clover.coverage.project.file)) {
                    const uri = vscode.Uri.file(cloverFile['@_name']);
                    const coveredStatements = parseInt(cloverFile.metrics['@_coveredstatements'], 10);
                    const totalStatements = parseInt(cloverFile.metrics['@_statements'], 10);
                    const lineCoverageData = CloverParser.ensureArray(cloverFile.line);
                    ret.push(new PHPUnitFileCoverage(uri, coveredStatements, totalStatements, lineCoverageData));
                }
            }
            if (clover.coverage?.project?.package?.file) {
                for (const cloverFile of CloverParser.ensureArray(clover.coverage.project.package.file)) {
                     const uri = vscode.Uri.file(cloverFile['@_name']);
                    const coveredStatements = parseInt(cloverFile.metrics['@_coveredstatements'], 10);
                    const totalStatements = parseInt(cloverFile.metrics['@_statements'], 10);
                    const lineCoverageData = CloverParser.ensureArray(cloverFile.line);
                    ret.push(new PHPUnitFileCoverage(uri, coveredStatements, totalStatements, lineCoverageData));
                }
            }

            return ret;
        } catch (ex: any) {
            console.error('Error parsing Clover file:', ex.message);
            // Depending on desired behavior, could re-throw or return empty
            return [];
        }
    }

}

interface CloverLineCoverage {
    '@_num': string;
    '@_count': string;
}

export class PHPUnitFileCoverage extends vscode.FileCoverage {
    public readonly detailedCoverage: vscode.FileCoverageDetail[];

    constructor(
        uri: vscode.Uri,
        coveredStatements: number,
        totalStatements: number,
        lineCoverageData: CloverLineCoverage[]
    ) {
        super(uri, new vscode.TestCoverageCount(coveredStatements, totalStatements));
        this.detailedCoverage = this.generateDetailedCoverage(lineCoverageData);
    }

    private generateDetailedCoverage(lineCoverageData: CloverLineCoverage[]): vscode.FileCoverageDetail[] {
        const ret: vscode.FileCoverageDetail[] = [];
        for (const l of lineCoverageData) {
            ret.push(new vscode.StatementCoverage(parseInt(l['@_count'], 10), new vscode.Position(parseInt(l['@_num'], 10) - 1, 0)));
        }
        return ret;
    }
}
