import { camelCase } from 'string-ts';
import { TestResultEvent, TestResultSummary } from './types';
import { IParser } from './ValueParser';

export class TestResultSummaryParser implements IParser<TestResultSummary> {
    private readonly pattern = (() => {
        const items = [
            'Error(s)?',
            'Failure(s)?',
            'Skipped',
            'Incomplete',
            'Risky',
            'PHPUnitsDeprecations',
        ];
        const end = '\\s(\\d+)[\\.\\s,]\\s?';
        const tests = `Test(s)?:${end}`;
        const assertions = `Assertions:${end}`;

        return new RegExp(
            [
                `^OK\\s+\\(\\d+\\stest(s)?`,
                `^${tests}${assertions}((${items.join('|')}):${end})*`,
            ].join('|'),
            'ig',
        );
    })();

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string) {
        const pattern = new RegExp(
            `((?<name>[\\w\\s]+):\\s(?<count>\\d+)|(?<count2>\\d+)\\s(?<name2>\\w+))[.s,]?`,
            'ig',
        );
        const event = TestResultEvent.testResultSummary;

        return [...text.matchAll(pattern)].reduce(
            (result: any, match) => {
                const groups = match.groups!;
                const [name, count] = groups.name
                    ? [groups.name, groups.count]
                    : [groups.name2, groups.count2];
                result[this.normalize(name)] = parseInt(count, 10);

                return result;
            },
            { event, text } as TestResultSummary,
        );
    }

    private normalize(name: string) {
        name = camelCase(name.trim());

        return ['skipped', 'incomplete', 'risky'].includes(name)
            ? name
            : `${name}${name.match(/s$/) ? '' : 's'}`;
    }
}
