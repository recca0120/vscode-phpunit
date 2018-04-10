import { Test, Type, Assertion } from './common';
import { JUnit } from './junit';
import { Ast } from './ast';
import { Collection } from '../collection';
import { tap } from '../helpers';
import { PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { FilesystemContract } from './../filesystem/contract';
import { Filesystem } from './../filesystem/index';

export class Testsuite {
    constructor(
        private ast: Ast = new Ast(),
        private jUnit: JUnit = new JUnit(),
        private collect: Collection = new Collection(),
        private files: FilesystemContract = new Filesystem()
    ) {}

    parseAst(code: string): any[] {
        return this.ast.parse(code);
    }

    async parseJUnit(code: string): Promise<Test[]> {
        return tap(await this.jUnit.parse(code), (tests: Test[]) => this.collect.put(tests));
    }

    getDiagnostics(): Map<string, PublishDiagnosticsParams> {
        return tap(new Map<string, PublishDiagnosticsParams>(), (map: Map<string, PublishDiagnosticsParams>) => {
            this.collect.forEach((tests: Test[], uri: string) => {
                map.set(uri, {
                    uri,
                    diagnostics: tests
                        .filter(this.filterByType.bind(this))
                        .map((test: Test) => this.convertToDiagonstic(test)),
                } as PublishDiagnosticsParams);
            });
        });
    }

    getAssertions(uri: string): Assertion[] {
        return this.collect.getAssertions().get(this.files.uri(uri)) || [];
    }

    private filterByType(test: Test): boolean {
        return [Type.ERROR, Type.FAILED, Type.FAILURE].indexOf(test.type) !== -1;
    }

    private convertToDiagonstic(test: Test): Diagnostic {
        return {
            severity: DiagnosticSeverity.Error,
            range: test.range,
            message: test.fault ? test.fault.message : '',
            source: 'PHPUnit',
        };
    }
}
