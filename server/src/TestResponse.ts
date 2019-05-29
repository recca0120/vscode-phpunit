import stripAnsi from 'strip-ansi';
import { Command } from 'vscode-languageserver-protocol';
import { PHPUnitOutput, ProblemMatcher, ProblemNode } from './ProblemMatcher';
// import {
//     Diagnostic,
//     DiagnosticSeverity,
//     DiagnosticRelatedInformation,
// } from 'vscode-languageserver-protocol';

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

export class TestResponse {
    private output: string = '';

    constructor(
        output: string,
        private command: Command | null = null,
        private problemMatcher: ProblemMatcher<any> = new PHPUnitOutput()
    ) {
        this.output = stripAnsi(output);
    }

    getCommand() {
        return this.command;
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

    // async asDiagnosticGroup(
    //     relatedInfo: boolean = true
    // ): Promise<Map<string, Diagnostic[]>> {
    //     const problemGroup = this.groupBy(
    //         await this.problemMatcher.parse(this.output)
    //     );

    //     const diagnosticGroup = new Map<string, Diagnostic[]>();

    //     problemGroup.forEach((problems, uri) => {
    //         const diagnostics = problems
    //             .map(problem => this.problemToDiagnostic(problem, relatedInfo))
    //             .filter(diagnostic => !!diagnostic);

    //         diagnosticGroup.set(uri, diagnostics);
    //     });
    //     problemGroup.clear();

    //     return diagnosticGroup;
    // }

    // private problemToDiagnostic(
    //     problem: Problem,
    //     hasRelatedInformation: boolean
    // ): Diagnostic | undefined {
    //     if (problem.status === Status.PASSED) {
    //         return undefined;
    //     }

    //     const diagnostic: Diagnostic = {
    //         severity:
    //             problem.status === Status.WARNING
    //                 ? DiagnosticSeverity.Warning
    //                 : DiagnosticSeverity.Error,
    //         range: problem.range,
    //         message: problem.message.trim(),
    //         source: 'PHPUnit',
    //     };

    //     if (hasRelatedInformation) {
    //         diagnostic.relatedInformation = problem.files.map(file => {
    //             return DiagnosticRelatedInformation.create(
    //                 file,
    //                 problem.message.trim()
    //             );
    //         });
    //     }

    //     return diagnostic;
    // }

    // private groupBy(problems: Problem[]) {
    //     return problems.reduce((group, problem) => {
    //         const problems: Problem[] = [problem];
    //         if (group.has(problem.uri)) {
    //             problems.push(...group.get(problem.uri));
    //         }

    //         group.set(problem.uri, problems);

    //         return group;
    //     }, new Map<string, Problem[]>());
    // }

    toString(): string {
        return this.output;
    }
}
