import { Filesystem, Factory as FilesystemFactory } from './filesystem';
import { Text } from './support/text';
import { TestResults } from './phpunit/test-results';
import { Test, Type, Detail } from './phpunit/common';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-protocol/lib/main';

export class DiagnosticProvider {
    constructor(private files: Filesystem = new FilesystemFactory().create(), private text: Text = new Text()) {}

    async asDiagnosticGroup(testResults: TestResults): Promise<Map<string, Diagnostic[]>> {
        const tests: Test[] = await Promise.all(
            testResults
                .getTests()
                .filter((test: Test) => test.type !== Type.PASSED)
                .map(async (test: Test) => {
                    test.range = await this.text.line(test.file, test.line - 1);

                    if (!test.fault) {
                        return test;
                    }

                    test.fault.details = await Promise.all(
                        test.fault.details.map(async (details: Detail) => {
                            details.range = await this.text.line(details.file, details.line - 1);

                            return details;
                        })
                    );

                    return test;
                })
        );

        return tests.reduce((diagnosticGroup: Map<string, Diagnostic[]>, test: Test): Map<string, Diagnostic[]> => {
            const uri = this.files.uri(test.file);
            const diagnostics: Diagnostic[] = diagnosticGroup.get(uri) || [];
            diagnostics.push({
                severity: test.type === Type.RISKY ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
                range: test.range,
                message: test.fault ? test.fault.message : '',
                relatedInformation: [],
                source: 'PHPUnit',
            });

            return diagnosticGroup.set(uri, diagnostics);
        }, new Map<string, Diagnostic[]>());
    }
}
