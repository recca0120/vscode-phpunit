import { CodeLens, TextDocument, DiagnosticSeverity } from 'vscode-languageserver';

import { DiagnosticProvider } from '../../src/providers';
import { Filesystem } from '../../src/filesystem';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Collection } from '../../src/collection';
import { parse } from 'fast-xml-parser';
import { files } from '../../src/filesystem';
import { JUnit, Test, Type } from '../../src/phpunit';
import { projectPath, pathPattern } from './../helpers';

describe('DiagnosticProvider Test', () => {
    const jUnit: JUnit = new JUnit();
    const path = projectPath('tests/AssertionsTest.php');
    let tests: Test[] = [];

    beforeEach(async () => {
        const content: string = await files.get(projectPath('junit.xml'));
        tests = await jUnit.parse(
            content.replace(pathPattern, (...m) => {
                return projectPath(m[1]);
            })
        );
    });

    it('it should get diagnostics from tests', () => {
        const collect: Collection = new Collection();
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider(collect).put(tests);

        expect(diagnosticProvider.provideDiagnostics(collect.get(path))).toEqual([
            {
                message: 'Failed asserting that false is true.',
                range: {
                    end: {
                        character: 33,
                        line: 15,
                    },
                    start: {
                        character: 8,
                        line: 15,
                    },
                },
                severity: 1,
                source: 'phpunit',
            },
            {
                message:
                    "Failed asserting that two arrays are identical.\n--- Expected\n+++ Actual\n@@ @@\n Array &0 (\n-    'a' => 'b'\n-    'c' => 'd'\n+    'e' => 'f'\n+    0 => 'g'\n+    1 => 'h'\n )",
                range: {
                    end: {
                        character: 76,
                        line: 20,
                    },
                    start: {
                        character: 8,
                        line: 20,
                    },
                },
                severity: 1,
                source: 'phpunit',
            },
        ]);
    });
});
