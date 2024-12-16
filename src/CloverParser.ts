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
            
            for (const cloverFile of CloverParser.ensureArray(clover.coverage.project.package.file)) {
                ret.push(new PHPUnitFileCoverage(cloverFile));

            }

            return ret;
        } catch (ex) {
            return [];
        }
    }

}

export class PHPUnitFileCoverage extends vscode.FileCoverage  {
    constructor(public readonly cloverFile: any) {
        super(vscode.Uri.file(cloverFile['@_name']), new vscode.TestCoverageCount(0, 0));
        this.statementCoverage.covered = cloverFile.metrics['@_coveredstatements'];
        this.statementCoverage.total = cloverFile.metrics['@_statements'];
    }

    public generateDetailedCoverage(): vscode.FileCoverageDetail[] {
        const ret = [];
        for (const l of CloverParser.ensureArray(this.cloverFile.line)) {
            ret.push(new vscode.StatementCoverage(parseInt(l['@_count'], 10), new vscode.Position(parseInt(l['@_num'], 10)-1, 0)));
        }
        return ret;
    }
}