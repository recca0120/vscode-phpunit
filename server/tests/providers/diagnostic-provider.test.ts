import { CodeLens, TextDocument, DiagnosticSeverity } from 'vscode-languageserver';

import { DiagnosticProvider } from '../../src/providers';
import { Filesystem } from '../../src/filesystem';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Collection } from '../../src/collection';
import { Type } from '../../src/phpunit';

describe('DiagnosticProvider Test', () => {
    it('it should get diagnostics from tests', () => {
        const root: string = resolve(__dirname, '../fixtures');
        const path: string = resolve(root, 'PHPUnitTest.php');
        const textDocument: TextDocument = TextDocument.create(path, 'php', 0.1, readFileSync(path).toString('utf8'));
        const collect: Collection = new Collection();
        collect.set([
            {
                name: 'testPassed',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 13,
                time: 0.010271,
                type: Type.PASSED,
            },
            {
                name: 'testFailed',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 20,
                time: 0.001953,
                type: Type.FAILURE,
                fault: {
                    type: 'PHPUnit\\Framework\\ExpectationFailedException',
                    message: 'Failed asserting that false is true.',
                    details: [
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 195,
                        },
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 148,
                        },
                    ],
                },
            },
            {
                name: 'testSkipped',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 23,
                time: 0.001044,
                type: Type.SKIPPED,
                fault: {
                    type: 'skipped',
                    message: '',
                    details: [],
                },
            },
            {
                name: 'testIncomplete',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 28,
                time: 0.001079,
                type: Type.SKIPPED,
                fault: {
                    type: 'skipped',
                    message: '',
                    details: [],
                },
            },
            {
                name: 'testNoAssertions',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 33,
                time: 0.000109,
                type: Type.RISKY,
                fault: {
                    type: 'PHPUnit\\Framework\\RiskyTestError',
                    message: 'Risky Test',
                    details: [
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 195,
                        },
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 148,
                        },
                    ],
                },
            },
            {
                name: 'testAssertNotEquals',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 39,
                time: 0.000778,
                type: Type.FAILURE,
                fault: {
                    type: 'PHPUnit\\Framework\\ExpectationFailedException',
                    message:
                        "Failed asserting that Array &0 (\n    'e' => 'f'\n    0 => 'g'\n    1 => 'h'\n) is identical to Array &0 (\n    'a' => 'b'\n    'c' => 'd'\n).",
                    details: [
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 195,
                        },
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 148,
                        },
                    ],
                },
            },
            {
                name: 'it_should_be_test_case',
                class: 'PHPUnitTest',
                classname: 'PHPUnitTest',
                file: path,
                line: 47,
                time: 0.000115,
                type: Type.RISKY,
                fault: {
                    type: 'PHPUnit\\Framework\\RiskyTestError',
                    message: 'Risky Test',
                    details: [
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 195,
                        },
                        {
                            file: resolve(root, 'composer/vendor/phpunit/phpunit/src/TextUI/Command.php'),
                            line: 148,
                        },
                    ],
                },
            },
        ]);

        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();

        expect(diagnosticProvider.provideDiagnostics(textDocument, collect.get(textDocument.uri))).toEqual([
            {
                message: 'Failed asserting that false is true.',
                range: {
                    end: {
                        character: 33,
                        line: 19,
                    },
                    start: {
                        character: 8,
                        line: 19,
                    },
                },
                severity: DiagnosticSeverity.Error,
                source: 'phpunit',
            },
            {
                message:
                    "Failed asserting that Array &0 (\n    'e' => 'f'\n    0 => 'g'\n    1 => 'h'\n) is identical to Array &0 (\n    'a' => 'b'\n    'c' => 'd'\n).",
                range: {
                    end: {
                        character: 76,
                        line: 38,
                    },
                    start: {
                        character: 8,
                        line: 38,
                    },
                },
                severity: DiagnosticSeverity.Error,
                source: 'phpunit',
            },
        ]);
    });
});
