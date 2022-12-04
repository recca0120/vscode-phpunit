import * as yargsParser from 'yargs-parser';
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

export enum TestResultEvent {
    testSuiteStarted = 'testSuiteStarted',
    testSuiteFinished = 'testSuiteFinished',
    testStarted = 'testStarted',
    testFailed = 'testFailed',
    testIgnored = 'testIgnored',
    testFinished = 'testFinished',
}

export enum TestExtraResultEvent {
    testVersion = 'testVersion',
    testCount = 'testCount',
    timeAndMemory = 'timeAndMemory',
    testResultCount = 'testResultCount',
}

export type TestResultKind = TestResultEvent | TestExtraResultEvent;

type TestResultBase = {
    kind: TestResultKind;
    event: TestResultEvent;
    name: string;
    flowId: number;
};
type TestSuiteStarted = TestResultBase & {
    id?: string;
    file?: string;
    locationHint?: string;
    testId?: string;
};
type TestSuiteFinished = TestResultBase;
type TestStarted = TestResultBase & { id: string; file: string; locationHint: string };
type TestFinished = TestResultBase & { duration: number };

type TestFailed = TestFinished & {
    message: string;
    details: Array<{ file: string; line: number }>;

    type?: string;
    actual?: string;
    expected?: string;
};

type TestIgnored = TestFailed;
export type TestCount = {
    kind: TestResultKind;
    event: TestResultEvent;
    count: number;
    flowId: number;
};
export type TestVersion = { kind: TestResultKind; version: string; text: string };
export type TimeAndMemory = { kind: TestResultKind; time: string; memory: string };
export type TestResultCount = {
    kind: TestResultKind;
    tests?: number;
    assertions?: number;
    errors?: number;
    failures?: number;
    skipped?: number;
    incomplete?: number;
    risky?: number;
};

export type TestResult = TestSuiteStarted &
    TestSuiteFinished &
    TestStarted &
    TestFailed &
    TestIgnored &
    TestFinished;

export type Result = TestResult | TestResultCount | TestCount | TimeAndMemory;

interface IParser<T> {
    is: (text: string) => boolean;
    parse: (text: string) => T;
}

class TestVersionParser implements IParser<TestVersion> {
    private pattern = new RegExp('^PHPUnit\\s(?<version>[\\d\\.]+)', 'i');

    is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    parse(text: string) {
        const groups = text.match(this.pattern)!.groups!;

        return {
            kind: TestExtraResultEvent.testVersion,
            version: groups.version,
            text,
        };
    }
}

class TestResultCountParser implements IParser<TestResultCount> {
    private readonly pattern = (() => {
        const items = ['Error(s)?', 'Failure(s)?', 'Skipped', 'Incomplete', 'Risky'];
        const end = '\\s(\\d+)[\\.\\s,]\\s?';
        const tests = `Test(s)?:${end}`;
        const assertions = `Assertions:${end}`;

        return new RegExp(
            `^OK\\s+\\(\\d+\\stest(s)?|^${tests}${assertions}((${items.join('|')}):${end})*`,
            'ig'
        );
    })();

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string) {
        const pattern = new RegExp(
            `((?<name>\\w+):\\s(?<count>\\d+)|(?<count2>\\d+)\\s(?<name2>\\w+))[.s,]?`,
            'ig'
        );
        const kind = TestExtraResultEvent.testResultCount;

        return [...text.matchAll(pattern)].reduce(
            (result: any, match) => {
                const groups = match.groups!;
                const [name, count] = groups.name
                    ? [groups.name, groups.count]
                    : [groups.name2, groups.count2];
                result[this.normalize(name)] = parseInt(count, 10);

                return result;
            },
            { kind } as TestResultCount
        );
    }

    private normalize(name: string) {
        name = name.toLowerCase();

        return ['skipped', 'incomplete', 'risky'].includes(name)
            ? name
            : `${name}${name.match(/s$/) ? '' : 's'}`;
    }
}

class TimeAndMemoryParser implements IParser<TimeAndMemory> {
    private readonly pattern = new RegExp(
        'Time:\\s(?<time>[\\d+:\\.]+(\\s\\w+)?),\\sMemory:\\s(?<memory>[\\d\\.]+\\s\\w+)'
    );

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TimeAndMemory {
        const { time, memory } = text.match(this.pattern)!.groups!;
        const kind = TestExtraResultEvent.timeAndMemory;

        return { time, memory, kind };
    }
}

export class Parser implements IParser<Result | undefined> {
    private readonly pattern = new RegExp('^\\s*#+teamcity');
    private readonly filePattern = new RegExp('(s+)?(?<file>.+):(?<line>\\d+)$');
    private readonly parsers = [
        new TestVersionParser(),
        new TimeAndMemoryParser(),
        new TestResultCountParser(),
    ];

    constructor(private escapeValue: EscapeValue) {}

    public parse(text: string): Result | undefined {
        return this.is(text)
            ? this.doParse(text)
            : this.parsers.find((parser) => parser.is(text))?.parse(text);
    }

    public is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    private doParse(text: string) {
        text = text
            .trim()
            .replace(this.pattern, '')
            .replace(/^\[|\]$/g, '');

        const { _, $0, ...argv } = this.unescapeArgv(this.toTeamcityArgv(text));
        argv.kind = argv.event;

        return {
            ...argv,
            ...this.parseLocationHint(argv),
            ...this.parseDetails(argv),
        } as TestResult;
    }

    private parseDetails(argv: Pick<Arguments, string | number>) {
        if (!argv.details) {
            return {};
        }

        return {
            details: argv.details
                .trim()
                .split(/\r\n|\n/g)
                .filter((fileAndLine: string) => fileAndLine.match(this.filePattern))
                .map((fileAndLine: string) => {
                    const { file, line } = fileAndLine.match(this.filePattern)!.groups!;

                    return {
                        file: file.replace(/^(-)+/, '').trim(),
                        line: parseInt(line, 10),
                    };
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
        const testId = id.replace(/\swith\sdata\sset\s[#"].+$/, '');

        return { id, file, testId };
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
        return yargsParser(text);
    }
}

class ProblemMatcher {
    private collect = new Map<string, TestResult>();

    private lookup: { [p: string]: Function } = {
        [TestResultEvent.testSuiteStarted]: this.handleStarted,
        [TestResultEvent.testStarted]: this.handleStarted,
        [TestResultEvent.testSuiteFinished]: this.handleFinished,
        [TestResultEvent.testFinished]: this.handleFinished,
        [TestResultEvent.testFailed]: this.handleFault,
        [TestResultEvent.testIgnored]: this.handleFault,
    };

    constructor(private parser: Parser) {}

    parse(
        input: string | Buffer
    ): TestResult | TestCount | TestResultCount | TimeAndMemory | undefined {
        const result = this.parser.parse(input.toString());

        return !result || this.isTestResult(result)
            ? result
            : this.lookup[(result as TestResult).event]?.call(this, result as TestResult);
    }

    private isTestResult(result: any) {
        return !('event' in result && 'name' in result && 'flowId' in result);
    }

    private handleStarted(testResult: TestResult) {
        const id = this.generateId(testResult);
        this.collect.set(id, { ...testResult });

        return this.collect.get(id);
    }

    private handleFault(testResult: TestResult) {
        const id = this.generateId(testResult);
        const prevData = this.collect.get(id);
        this.collect.set(id, { ...prevData, ...testResult });
    }

    private handleFinished(testResult: TestResult) {
        const id = this.generateId(testResult);

        const prevData = this.collect.get(id)!;
        const event = this.isFault(prevData) ? prevData.event : testResult.event;
        const kind = event;
        const result = { ...prevData, ...testResult, event, kind };
        this.collect.delete(id);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TestResultEvent.testFailed, TestResultEvent.testIgnored].includes(testResult.event);
    }

    private generateId(testResult: TestResult) {
        return `${testResult.name}-${testResult.flowId}`;
    }
}

export const parser = new Parser(new EscapeValue());
export const problemMatcher = new ProblemMatcher(parser);
