import { Test, Type, Detail, Fault } from './phpunit/common';
import { Diagnostic, DiagnosticSeverity, DiagnosticRelatedInformation } from 'vscode-languageserver-types';

export class DiagnosticProvider {
    asDiagnosticGroup(tests: Test[]): Map<string, Diagnostic[]> {
        return this.groupBy(tests);
    }

    private groupBy(tests: Test[]): Map<string, Diagnostic[]> {
        return tests.reduce((diagnosticGroup: Map<string, Diagnostic[]>, test: Test): Map<string, Diagnostic[]> => {
            const diagnostics: Diagnostic[] = diagnosticGroup.get(test.uri) || [];

            if (test.type === Type.PASSED) {
                return diagnosticGroup.set(test.uri, diagnostics);
            }

            const fault: Fault = test.fault;
            const message: string = fault.message || '';
            const details: Detail[] = fault.details || [];

            diagnostics.push({
                severity: test.type === Type.RISKY ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
                range: test.range,
                message: message,
                relatedInformation: this.asDiagnosticRelationInformations(details, message),
                source: 'PHPUnit',
            });

            return diagnosticGroup.set(test.uri, diagnostics);
        }, new Map<string, Diagnostic[]>());
    }

    private asDiagnosticRelationInformations(details: Detail[], message: string): DiagnosticRelatedInformation[] {
        return details.map((detail: Detail) => {
            return DiagnosticRelatedInformation.create(
                {
                    range: detail.range,
                    uri: detail.uri,
                },
                message
            );
        });
    }
}
