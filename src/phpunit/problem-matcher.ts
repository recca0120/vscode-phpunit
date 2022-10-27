import * as parser from 'yargs-parser';
import { Arguments } from 'yargs-parser';

export class EscapeValue {
    private values = {
        escape: ['||', "|'", '|n', '|r', '|]', '|['],
        unescape: ['|', "'", '\n', '\r', ']', '['],
    };

    private patterns: { unescape: RegExp[]; escape: RegExp[] };

    constructor() {
        this.patterns = {
            escape: this.toRegExp(this.values.escape),
            unescape: this.toRegExp(this.values.unescape),
        };
    }

    public escape(value: string | number | object) {
        return this.doEscape(value, this.patterns.unescape, this.values.escape);
    }

    public unescape(value: string | number | object) {
        return this.doEscape(value, this.patterns.escape, this.values.unescape);
    }

    private doEscape(value: string | number | object, from: RegExp[], to: string[]) {
        if (typeof value !== 'string') {
            return value;
        }

        for (const x in from) {
            value = value.replace(from[x], to[x]);
        }

        return value;
    }

    private toRegExp(values: string[]) {
        return values.map((str) => {
            str = str.replace(/([|\]\[])/g, (m) => `\\${m}`);

            return new RegExp(str, 'g');
        });
    }
}

export enum TeamcityEvent {
    testCount = 'testCount',
    testSuiteStarted = 'testSuiteStarted',
    testSuiteFinished = 'testSuiteFinished',
    testStarted = 'testStarted',
    testFailed = 'testFailed',
    testIgnored = 'testIgnored',
    testFinished = 'testFinished',
}

type TestCount = { event: TeamcityEvent; count: number; flowId: number };
type TeamcityInfo = { event: TeamcityEvent; name: string; flowId: number };
type TestSuiteStarted = TeamcityInfo & { id?: string; file?: string; locationHint?: string };
type TestSuiteFinished = TeamcityInfo;
type TestStarted = TeamcityInfo & { id: string; file: string; locationHint: string };
type TestFinished = TeamcityInfo & { duration: number };
type TestResult = {
    tests?: number;
    assertions?: number;
    errors?: number;
    failures?: number;
    skipped?: number;
    incomplete?: number;
    risky?: number;
};

type TestFailed = TestFinished & {
    message: string;
    details: Array<{ file: string; line: number }>;

    type?: string;
    actual?: string;
    expected?: string;
};

type TestIgnored = TestFailed;

type TimeAndMemory = { time: string; memory: string };

type TeamcityResult =
    | TestSuiteStarted
    | TestSuiteFinished
    | TestStarted
    | TestFailed
    | TestIgnored
    | TestFinished;

export class TeamcityParser {
    private readonly teamcityPattern = /^\s*#+teamcity/;
    private readonly timeAndMemoryPattern =
        /Time: (?<time>[\d+:\.]+), Memory: (?<memory>[\d\.]+\s\w+)/;

    private readonly testResultPattern = (() => {
        const items = ['Errors', 'Failures', 'Skipped', 'Incomplete', 'Risky'];
        const end = '\\s(\\d+)[\\.\\s,]\\s?';
        const tests = `Tests:${end}`;
        const assertions = `Assertions:${end}`;

        return new RegExp(`^${tests}${assertions}((${items.join('|')}):${end})*`, 'g');
    })();

    constructor(private escapeValue: EscapeValue) {}

    public parse(
        text: string
    ): TeamcityResult | TestCount | TestResult | TimeAndMemory | undefined {
        if (this.isTeamcity(text)) {
            return this.parseTeamcity(text);
        }

        if (this.isTimeAndMemory(text)) {
            return this.parseTimeAnMemory(text);
        }

        if (this.isTestResult(text)) {
            return this.parseTestResult(text);
        }

        return undefined;
    }

    private isTestResult(text: string) {
        return text.match(this.testResultPattern);
    }

    private parseTestResult(text: string) {
        const pattern = new RegExp(`(?<name>\\w+):\\s(?<count>\\d+)[\\.\\s,]?`, 'g');

        return [...text.matchAll(pattern)].reduce((result: any, match) => {
            const { name, count } = match.groups!;
            result[name.toLowerCase()] = parseInt(count, 10);

            return result;
        }, {} as TestResult);
    }

    private isTimeAndMemory(text: string) {
        return !!text.match(this.timeAndMemoryPattern);
    }

    private parseTimeAnMemory(text: string): TimeAndMemory {
        const { time, memory } = text.match(this.timeAndMemoryPattern)!.groups!;

        return { time, memory };
    }

    private isTeamcity(text: string): boolean {
        return !!text.match(this.teamcityPattern);
    }

    private parseTeamcity(text: string) {
        text = text
            .trim()
            .replace(this.teamcityPattern, '')
            .replace(/^\[|\]$/g, '');

        const { _, $0, ...argv } = this.unescapeArgv(this.toTeamcityArgv(text));

        return {
            ...argv,
            ...this.parseLocationHint(argv),
            ...this.parseDetails(argv),
        } as TeamcityResult;
    }

    private parseDetails(argv: Pick<Arguments, string | number>) {
        if (!argv.details) {
            return {};
        }

        return {
            details: argv.details
                .trim()
                .split(/\r\n|\n/g)
                .filter((detail: string) => !!detail)
                .map((detail: string) => {
                    const { file, line } = /(?<file>.+):(?<line>\d+)$/g.exec(detail)!.groups!;

                    return { file, line: parseInt(line, 10) };
                }),
        };
    }

    private parseLocationHint(argv: Pick<Arguments, string | number>) {
        if (!argv.locationHint) {
            return {};
        }

        const locationHint = argv.locationHint;
        const split = locationHint
            .replace(/^php_qn:\/\//, '')
            .replace(/::\\/g, '::')
            .split('::');
        const file = split.shift();
        const id = split.join('::');

        return { id, file };
    }

    private unescapeArgv(argv: Pick<Arguments, string | number>) {
        for (const x in argv) {
            argv[x] = this.escapeValue.unescape(argv[x]);
        }

        return argv;
    }

    private toTeamcityArgv(text: string) {
        const [eventName, ...args] = this.parseArgv(text)._;
        const command = [
            `--event='${eventName}'`,
            ...args.map((parameter) => `--${parameter}`),
        ].join(' ');

        return this.parseArgv(command);
    }

    private parseArgv(text: string): Arguments {
        return parser(text);
    }
}

class ProblemMatcher {
    private collect = new Map<string, TeamcityResult>();

    private lookup: { [p: string]: Function } = {
        [TeamcityEvent.testSuiteStarted]: this.handleStarted,
        [TeamcityEvent.testStarted]: this.handleStarted,
        [TeamcityEvent.testSuiteFinished]: this.handleFinished,
        [TeamcityEvent.testFinished]: this.handleFinished,
        [TeamcityEvent.testFailed]: this.handleFault,
        [TeamcityEvent.testIgnored]: this.handleFault,
    };

    constructor(private parser: TeamcityParser) {}

    read(input: string | Buffer): any {
        const result = this.parser.parse(input.toString());

        if (result === undefined) {
            return;
        }

        if (this.isReturn(result)) {
            return result;
        }

        return this.lookup[(result as TeamcityResult).event]?.call(this, result as TeamcityResult);
    }

    private isReturn(result: TeamcityResult | TestCount | TestResult | TimeAndMemory) {
        return (
            (result as TimeAndMemory).hasOwnProperty('memory') ||
            (result as TestCount).event === TeamcityEvent.testCount ||
            (result as TestResult).hasOwnProperty('tests')
        );
    }

    private handleStarted(result: TeamcityResult) {
        const id = this.generateId(result);
        this.collect.set(id, { ...result });

        return this.collect.get(id);
    }

    private handleFault(result: TeamcityResult) {
        const id = this.generateId(result);
        const prevData = this.collect.get(id);
        this.collect.set(id, { ...prevData, ...result });
    }

    private handleFinished(result: TeamcityResult) {
        const id = this.generateId(result);

        const prevData = this.collect.get(id)!;
        const event = this.isFault(prevData) ? prevData.event : result.event;
        this.collect.set(id, { ...prevData, ...result, event });

        return this.collect.get(id);
    }

    private isFault(result: TeamcityResult) {
        return [TeamcityEvent.testFailed, TeamcityEvent.testIgnored].includes(result.event);
    }

    private generateId(result: TeamcityResult) {
        return `${result.name}-${result.flowId}`;
    }
}

export const teamcityParser = new TeamcityParser(new EscapeValue());
export const problemMatcher = new ProblemMatcher(teamcityParser);
