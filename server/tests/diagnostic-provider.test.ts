import { DiagnosticProvider } from '../src/diagnostic-provider';
import { Textline } from '../src/support/textline';
import { Filesystem, WINDOWS } from '../src/filesystem';
import { Type } from '../src/phpunit/common';
import { Range } from 'vscode-languageserver-types';

describe('DiagnosticProvider Test', () => {
    it('it should return diagnostic group', () => {
        const files: Filesystem = new WINDOWS();
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider(files);
        const range: Range = Range.create(1, 1, 1, 1);

        expect(
            diagnosticProvider.asDiagnosticGroup([
                {
                    name: 'passed',
                    class: 'PHPUnitTest',
                    classname: '',
                    file: '/vscode-phpunit/tests/PHPUnitTest.php',
                    line: 13,
                    time: 0.006241,
                    type: Type.PASSED,
                    range,
                },
                {
                    name: 'error',
                    class: 'PHPUnitTest',
                    classname: '',
                    file: '/vscode-phpunit/tests/PHPUnitTest.php',
                    line: 23,
                    time: 0.001087,
                    type: Type.ERROR,
                    range,
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
                                range,
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
                            range,
                            relatedInformation: [
                                {
                                    location: {
                                        range,
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

    it('it should return empty diagnostics when all pass', () => {
        const files: Filesystem = new WINDOWS();
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider(files);
        const range: Range = Range.create(1, 1, 1, 1);

        expect(
            diagnosticProvider.asDiagnosticGroup([
                {
                    name: 'passed',
                    class: 'PHPUnitTest',
                    classname: '',
                    file: '/vscode-phpunit/tests/PHPUnitTest.php',
                    line: 13,
                    time: 0.006241,
                    type: Type.PASSED,
                    range,
                },
            ])
        ).toEqual(new Map<string, any[]>([['file:///vscode-phpunit/tests/PHPUnitTest.php', []]]));
    });
});
