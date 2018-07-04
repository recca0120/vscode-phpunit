import { Filesystem, Factory as FilesystemFactory } from './filesystem';
import { Test, Type, Detail, Fault } from './phpunit/common';
import { Diagnostic, DiagnosticSeverity, DiagnosticRelatedInformation, Range } from 'vscode-languageserver-types';

export class DiagnosticProvider {
    constructor(private files: Filesystem = new FilesystemFactory().create()) {}

    asDiagnosticGroup(tests: Test[]): Map<string, Diagnostic[]> {
        return this.groupBy(tests);
    }

    private groupBy(tests: Test[]): Map<string, Diagnostic[]> {
        return tests.reduce((diagnosticGroup: Map<string, Diagnostic[]>, test: Test): Map<string, Diagnostic[]> => {
            const uri = this.files.uri(test.file);
            const diagnostics: Diagnostic[] = diagnosticGroup.get(uri) || [];

            if (test.type === Type.PASSED) {
                return diagnosticGroup.set(uri, diagnostics);
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

            return diagnosticGroup.set(uri, diagnostics);
        }, new Map<string, Diagnostic[]>());
    }

    private asDiagnosticRelationInformations(details: Detail[], message: string): DiagnosticRelatedInformation[] {
        return details.map((detail: Detail) => {
            return DiagnosticRelatedInformation.create(
                {
                    range: detail.range,
                    uri: this.files.uri(detail.file),
                },
                message
            );
        });
    }
}
