import { TestIdentifierFactory } from '../TestIdentifier';
import type { Teamcity } from '../types';
import { parseTeamcity } from './parseTeamcity';
import { TestDurationParser } from './TestDurationParser';
import { TestResultSummaryParser } from './TestResultSummaryParser';
import { TestVersionParser } from './TestVersionParser';
import {
    TeamcityEvent,
    type TestConfiguration,
    type TestProcesses,
    type TestResult,
    type TestRuntime,
} from './types';
import { type IParser, ValueParser } from './ValueParser';

export class TeamcityLineParser implements IParser<TestResult | undefined> {
    private readonly pattern = /^.*#+teamcity/;
    private readonly filePattern = /(\s+)?(?<file>.+):(?<line>\d+)$/;
    private readonly parsers = [
        new TestVersionParser(),
        new ValueParser<TestRuntime>('Runtime', TeamcityEvent.testRuntime),
        new ValueParser<TestConfiguration>('Configuration', TeamcityEvent.testConfiguration),
        new ValueParser<TestProcesses>('Processes', TeamcityEvent.testProcesses),
        new TestDurationParser(),
        new TestResultSummaryParser(),
    ];

    public is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TestResult | undefined {
        if (this.is(text)) {
            return this.doParse(text);
        }

        const parser = this.parsers.find((p) => p.is(text));
        return parser?.parse(text);
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

        return TestIdentifierFactory.create(argv.locationHint).fromLocationHint(
            argv.locationHint,
            argv.name,
        );
    }
}
