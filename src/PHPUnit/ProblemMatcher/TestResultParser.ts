import { TransformerFactory } from '../Transformer';
// Removed import of Teamcity from '../types';
import { parseTeamcity } from '../utils';
import { TestConfigurationParser } from './TestConfigurationParser';
import { TestDurationParser } from './TestDurationParser';
import { TestProcessesParser } from './TestProcessesParser';
import { TestResultSummaryParser } from './TestResultSummaryParser';
import { TestRuntimeParser } from './TestRuntimeParser';
import { TestVersionParser } from './TestVersionParser';
import { TestResult } from './types';
import { IParser } from './ValueParser';

export class TestResultParser implements IParser<TestResult | undefined> {
    private readonly pattern = new RegExp('^.*#+teamcity');
    private readonly filePattern = new RegExp('(s+)?(?<file>.+):(?<line>\\d+)$');
    private readonly parsers = [
        new TestVersionParser(),
        new TestRuntimeParser(),
        new TestConfigurationParser(),
        new TestProcessesParser(),
        new TestDurationParser(),
        new TestResultSummaryParser(),
    ];

    public is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TestResult | undefined {
        return this.is(text) ? this.doParse(text) : this.parsers.find((parser) => parser.is(text))?.parse(text);
    }

    private doParse(text: string) {
        const teamcity = parseTeamcity(text);

        return {
            ...teamcity,
            ...this.parseLocationHint(teamcity),
            ...this.parseDetails(teamcity),
        } as TestResult;
    }

    private parseDetails(teamcity: any): Partial<TestResult> { // Changed type to any
        if (!('details' in teamcity)) {
            return {};
        }

        let message = teamcity.message;
        const details = this.parseFileAndLine(teamcity.message);
        details.forEach(({ file, line }) => {
            // Use a more robust replace to avoid issues with multiple occurrences or partial matches
            message = message.split(`${file}:${line}`).join('').trim();
        });

        return {
            message: message.trim(),
            details: [...details, ...this.parseFileAndLine(teamcity.details)],
        };
    }

    private parseFileAndLine(text: string): { file: string; line: number }[] {
        if (!text) {
            return [];
        }
        const details: { file: string; line: number }[] = [];
        const lines = text.trim().split(/\r\n|\n/g);

        for (const line of lines) {
            const match = line.match(this.filePattern);
            if (match && match.groups) {
                const { file, line: lineStr } = match.groups;
                details.push({
                    file: file.replace(/^(-)+|^at\s+/, '').trim(),
                    line: parseInt(lineStr, 10),
                });
            }
        }

        return details;
    }

    private parseLocationHint(argv: any): Partial<TestResult> { // Changed type to any as Teamcity is removed
        if (!argv.locationHint) {
            return {};
        }

        return TransformerFactory.factory(argv.locationHint).fromLocationHit(argv.locationHint, argv.name);
    }
}
