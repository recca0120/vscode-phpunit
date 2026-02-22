import { camelCase } from '../utils';
import { TeamcityEvent, type TestResultSummary } from './types';
import type { IParser } from './ValueParser';

export class TestResultSummaryParser implements IParser<TestResultSummary> {
    private readonly pattern = (() => {
        const items = [
            'Error(s)?',
            'Failure(s)?',
            'Skipped',
            'Incomplete',
            'Risky',
            'PHPUnit Deprecations',
        ];
        const end = '\\s+(\\d+)[\\.\\s,]\\s?';
        const tests = `Test(s)?:${end}`;
        const assertions = `(Assertions:${end})?`;

        return new RegExp(
            [
                `^OK\\s+\\(\\d+\\stest(s)?`,
                `s*${tests}${assertions}((${items.join('|')}):${end})*`,
            ].join('|'),
            'ig',
        );
    })();

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string) {
        const pattern = /((?<name>[\w\s]+):\s(?<count>\d+)|(?<count2>\d+)\s(?<name2>\w+))[.s,]?/gi;
        const event = TeamcityEvent.testResultSummary;

        const result: TestResultSummary & Record<string, unknown> = { event, text };
        for (const match of text.matchAll(pattern)) {
            const matched = match.groups;
            if (!matched) {
                continue;
            }
            const [name, count] = matched.name
                ? [matched.name, matched.count]
                : [matched.name2, matched.count2];
            result[this.normalize(name)] = parseInt(count, 10);
        }
        return result;
    }

    private normalize(name: string) {
        name = camelCase(name.trim());

        return name.endsWith('ed') || ['incomplete', 'risky'].includes(name)
            ? name
            : `${name}${name.match(/s$/) ? '' : 's'}`;
    }
}
