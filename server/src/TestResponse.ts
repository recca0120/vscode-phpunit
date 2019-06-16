import stripAnsi from 'strip-ansi';
import { ProblemMatcher } from './ProblemMatcher';
import { ProblemNode } from './ProblemNode';

export interface TestResult {
    [index: string]: number | undefined;
    tests?: number;
    assertions?: number;
    errors?: number;
    failures?: number;
    warnings?: number;
    skipped?: number;
    incomplete?: number;
    risky?: number;
}

export interface ITestResponse {
    asProblems: () => Promise<ProblemNode[]>;
    getTestResult: () => TestResult;
    toString: () => string;
}

export class FailedTestResponse implements ITestResponse {
    constructor(private output: string) {}

    asProblems() {
        return Promise.resolve([]);
    }

    getTestResult() {
        return {
            tests: 0,
            assertions: 0,
            errors: 0,
            failures: 0,
            warnings: 0,
            skipped: 0,
            incomplete: 0,
            risky: 0,
        };
    }

    toString(): string {
        return this.output;
    }
}

export class TestResponse implements ITestResponse {
    private output: string;
    constructor(output: string, private problemMatcher: ProblemMatcher) {
        this.output = stripAnsi(output);
    }

    async asProblems(): Promise<ProblemNode[]> {
        return await this.problemMatcher.parse(this.output);
    }

    getTestResult() {
        const result: TestResult = {
            tests: 0,
            assertions: 0,
            errors: 0,
            failures: 0,
            warnings: 0,
            skipped: 0,
            incomplete: 0,
            risky: 0,
        };

        if (!this.isTestResult()) {
            return result;
        }

        return Object.assign(
            {},
            this.parseSuccessFul() || this.parseTestResult()
        );
    }

    private parseSuccessFul() {
        const matches = this.output.match(
            new RegExp('OK \\((\\d+) test(s?), (\\d+) assertion(s?)\\)')
        );

        if (matches) {
            return {
                tests: parseInt(matches[1], 10),
                assertions: parseInt(matches[3], 10),
            };
        }

        return false;
    }

    private isTestResult() {
        const pattern = [
            'OK \\((\\d+) test(s?), (\\d+) assertion(s?)\\)',
            'ERRORS!',
            'FAILURES!',
            'WARNINGS!',
            'OK, but incomplete, skipped, or risky tests!',
        ].join('|');

        return new RegExp(pattern, 'ig').test(this.output);
    }

    private parseTestResult() {
        const pattern = [
            'Test(s?)',
            'Assertion(s?)',
            'Error(s?)',
            'Failure(s?)',
            'Warning(s?)',
            'Skipped',
            'Incomplete',
            'Risky',
        ].join('|');

        const matches = this.output.match(
            new RegExp(`(${pattern}):\\s(\\d+)`, 'ig')
        );

        if (!matches) {
            return undefined;
        }

        const plural = ['test', 'assertion', 'error', 'failure', 'warning'];
        const result: TestResult = {};

        for (const text of matches) {
            const match = text.match(new RegExp('(\\w+?(s?)):\\s(\\d+)'));
            const value = parseInt(match![3], 10);
            let key = match![1].toLowerCase();
            if (plural.includes(key)) {
                key = `${key}s`;
            }

            result[key] = value;
        }

        return result;
    }

    toString(): string {
        return this.output;
    }
}
