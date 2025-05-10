import { camelCase } from '../utils';
import { TeamcityEvent, TestResultSummary } from './types';
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
        const end = '\\s+(\\d+)[\\.\\s,]\\s?';
        const tests = `Test(s)?:${end}`;
        const assertions = `(Assertions:${end})?`;

        return new RegExp(
            [
                `^OK\\s+\\(\\d+\\stest(s)?`,
                `\s*${tests}${assertions}((${items.join('|')}):${end})*`,
            ].join('|'),
            'ig',
        );
    })();

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TestResultSummary {
        const pattern = new RegExp(
            `((?<name>[\\w\\s]+):\\s(?<count>\\d+)|(?<count2>\\d+)\\s(?<name2>\\w+))[.s,]?`,
            'ig',
        );
        const event = TeamcityEvent.testResultSummary;
        const result: TestResultSummary = { event, text }; // Initialize result object

        for (const match of text.matchAll(pattern)) {
            const matched = match.groups!;
            let name: string;
            let count: number;

            if (matched.name) { // Matched "Name: Count"
                name = matched.name;
                count = parseInt(matched.count, 10);
            } else { // Matched "Count Name"
                name = matched.name2;
                count = parseInt(matched.count2, 10);
            }

            // Assign to result using the normalized name
            (result as any)[this.normalize(name)] = count;
        }

        return result;
    }

    private normalize(name: string): string {
        name = camelCase(name.trim());

        // Handle pluralization and specific names
        if (name.endsWith('ed') || ['incomplete', 'risky'].includes(name)) {
            return name;
        }

        // Add 's' if it's not already plural
        return name.endsWith('s') ? name : `${name}s`;
    }
}
