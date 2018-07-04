import { DiagnosticProvider } from '../src/diagnostic-provider';
import { Textline } from '../src/support/textline';
import { Filesystem, WINDOWS } from '../src/filesystem';
import { Type } from '../src/phpunit/common';

describe('DiagnosticProvider Test', () => {
    it('it should return diagnostic group', async () => {
        const files: Filesystem = new WINDOWS();
        const textline: Textline = new Textline();
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider(textline, files);

        spyOn(textline, 'line').and.returnValues(
            {
                end: {
                    character: 11,
                    line: 12,
                },
                start: {
                    character: 5,
                    line: 12,
                },
            },
            {
                end: {
                    character: 11,
                    line: 22,
                },
                start: {
                    character: 5,
                    line: 22,
                },
            },
            {
                end: {
                    character: 15,
                    line: 24,
                },
                start: {
                    character: 9,
                    line: 24,
                },
            }
        );

        expect(
            await diagnosticProvider.asDiagnosticGroup([
                {
                    name: 'passed',
                    class: 'PHPUnitTest',
                    classname: '',
                    file: '/vscode-phpunit/tests/PHPUnitTest.php',
                    line: 13,
                    time: 0.006241,
                    type: Type.PASSED,
                },
                {
                    name: 'error',
                    class: 'PHPUnitTest',
                    classname: '',
                    file: '/vscode-phpunit/tests/PHPUnitTest.php',
                    line: 23,
                    time: 0.001087,
                    type: Type.ERROR,
                    fault: {
                        type: 'PHPUnit_Framework_Exception',
                        message: [
                            'PHPUnitTest::error',
                            'PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                        ].join('\n'),
                        details: [
                            {
                                file: '/vscode-phpunit/tests/PHPUnitTest.php',
                                line: 25,
                            },
                        ],
                    },
                },
            ])
        ).toEqual(
            new Map<string, any[]>([
                [
                    'file:///vscode-phpunit/tests/PHPUnitTest.php',
                    [
                        {
                            message: [
                                'PHPUnitTest::error',
                                'PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                            ].join('\n'),
                            range: { end: { character: 11, line: 22 }, start: { character: 5, line: 22 } },
                            relatedInformation: [
                                {
                                    location: {
                                        range: {
                                            end: {
                                                character: 15,
                                                line: 24,
                                            },
                                            start: {
                                                character: 9,
                                                line: 24,
                                            },
                                        },
                                        uri: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                                    },
                                    message: [
                                        'PHPUnitTest::error',
                                        'PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                                    ].join('\n'),
                                },
                            ],
                            severity: 1,
                            source: 'PHPUnit',
                        },
                    ],
                ],
            ])
        );
    });

    it('it should return empty diagnostics when all pass', async () => {
        const files: Filesystem = new WINDOWS();
        const textline: Textline = new Textline();
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider(textline, files);

        spyOn(textline, 'line').and.returnValues({
            end: {
                character: 11,
                line: 12,
            },
            start: {
                character: 5,
                line: 12,
            },
        });

        expect(
            await diagnosticProvider.asDiagnosticGroup([
                {
                    name: 'passed',
                    class: 'PHPUnitTest',
                    classname: '',
                    file: '/vscode-phpunit/tests/PHPUnitTest.php',
                    line: 13,
                    time: 0.006241,
                    type: Type.PASSED,
                },
            ])
        ).toEqual(new Map<string, any[]>([['file:///vscode-phpunit/tests/PHPUnitTest.php', []]]));
    });
});
