import { Filesystem, Factory as FilesystemFactory } from './filesystem';
import { Text } from './support/text';
import { Test, Type, Detail, Fault } from './phpunit/common';
import { Diagnostic, DiagnosticSeverity, DiagnosticRelatedInformation, Range } from 'vscode-languageserver-protocol';

export class DiagnosticProvider {
    constructor(private text: Text = new Text(), private files: Filesystem = new FilesystemFactory().create()) {}

    async asDiagnosticGroup(tests: Test[]): Promise<Map<string, Diagnostic[]>> {
        tests = await Promise.all(
            tests.filter((test: Test) => test.type !== Type.PASSED).map(async (test: Test) => {
                test.range = await this.findRange(test);

                if (!test.fault || !test.fault.details) {
                    return test;
                }

                test.fault.details = await Promise.all(
                    test.fault.details.map(async (detail: Detail) => {
                        detail.range = await this.findRange(detail);

                        return detail;
                    })
                );

                return test;
            })
        );

        return this.groupBy(tests);
    }

    private groupBy(tests: Test[]): Map<string, Diagnostic[]> {
        return tests.reduce((diagnosticGroup: Map<string, Diagnostic[]>, test: Test): Map<string, Diagnostic[]> => {
            const uri = this.files.uri(test.file);
            const diagnostics: Diagnostic[] = diagnosticGroup.get(uri) || [];
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

    private async findRange(obj: Test | Detail): Promise<Range> {
        return await this.text.line(obj.file, obj.line - 1);
    }
}
