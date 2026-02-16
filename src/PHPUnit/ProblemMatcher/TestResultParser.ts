import { TransformerFactory } from '../Transformer';
import type { Teamcity } from '../types';
import { parseTeamcity } from './parseTeamcity';
import { TestConfigurationParser } from './TestConfigurationParser';
import { TestDurationParser } from './TestDurationParser';
import { TestProcessesParser } from './TestProcessesParser';
import { TestResultSummaryParser } from './TestResultSummaryParser';
import { TestRuntimeParser } from './TestRuntimeParser';
import { TestVersionParser } from './TestVersionParser';
import type { TestResult } from './types';
import type { IParser } from './ValueParser';

export class TestResultParser implements IParser<TestResult | undefined> {
    private readonly pattern = /^.*#+teamcity/;
    private readonly filePattern = /(\s+)?(?<file>.+):(?<line>\d+)$/;
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
        return this.is(text)
            ? this.doParse(text)
            : this.parsers.find((parser) => parser.is(text))?.parse(text);
    }

    private doParse(text: string) {
        const teamcity = parseTeamcity(text);

        return {
            ...teamcity,
            ...this.parseLocationHint(teamcity),
            ...this.parseDetails(teamcity),
        } as TestResult;
    }

    private parseDetails(teamcity: Teamcity): Partial<TestResult> {
        if (!('details' in teamcity)) {
            return {};
        }

        let message = teamcity.message;
        const details = this.parseFileAndLine(teamcity.message);
        details.forEach(({ file, line }) => {
            message = message.replace(`${file}:${line}`, '');
        });

        return {
            message: message.trim(),
            details: [...details, ...this.parseFileAndLine(teamcity.details)],
        };
    }

    private parseFileAndLine(text: string) {
        return text
            .trim()
            .split(/\r\n|\n/g)
            .flatMap((input) => {
                const match = input.match(this.filePattern);
                if (!match?.groups) {
                    return [];
                }
                return {
                    file: match.groups.file.replace(/^(-)+|^at\s+/, '').trim(),
                    line: Number.parseInt(match.groups.line, 10),
                };
            });
    }

    private parseLocationHint(argv: Teamcity): Partial<TestResult> {
        if (!argv.locationHint) {
            return {};
        }

        return TransformerFactory.create(argv.locationHint).fromLocationHit(
            argv.locationHint,
            argv.name,
        );
    }
}
