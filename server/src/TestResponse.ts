import { PHPUnitOutput, Problem, Status } from './ProblemMatcher';
import {
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticRelatedInformation,
} from 'vscode-languageserver-protocol';

export class TestResponse {
    constructor(
        private output: string,
        private problemMatcher: PHPUnitOutput = new PHPUnitOutput()
    ) {}

    async asDiagnosticGroup(
        relatedInfo: boolean = true
    ): Promise<Map<string, Diagnostic[]>> {
        const problemGroup = this.groupBy(
            await this.problemMatcher.parse(this.output)
        );

        const diagnosticGroup = new Map<string, Diagnostic[]>();

        problemGroup.forEach((problems, uri) => {
            const diagnostics = problems
                .map(problem => this.problemToDiagnostic(problem, relatedInfo))
                .filter(diagnostic => !!diagnostic);

            diagnosticGroup.set(uri, diagnostics);
        });
        problemGroup.clear();

        return diagnosticGroup;
    }

    private problemToDiagnostic(
        problem: Problem,
        hasRelatedInformation: boolean
    ): Diagnostic | undefined {
        if (problem.status === Status.PASSED) {
            return undefined;
        }

        const diagnostic: Diagnostic = {
            severity:
                problem.status === Status.WARNING
                    ? DiagnosticSeverity.Warning
                    : DiagnosticSeverity.Error,
            range: problem.range,
            message: problem.message.trim(),
            source: 'PHPUnit',
        };

        if (hasRelatedInformation) {
            diagnostic.relatedInformation = problem.files.map(file => {
                return DiagnosticRelatedInformation.create(
                    file,
                    problem.message.trim()
                );
            });
        }

        return diagnostic;
    }

    private groupBy(problems: Problem[]) {
        return problems.reduce((group, problem) => {
            const problems: Problem[] = [problem];
            if (group.has(problem.uri)) {
                problems.push(...group.get(problem.uri));
            }

            group.set(problem.uri, problems);

            return group;
        }, new Map<string, Problem[]>());
    }

    toString(): string {
        return this.output;
    }
}
