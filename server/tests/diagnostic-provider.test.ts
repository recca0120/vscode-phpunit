import { DiagnosticProvider } from '../src/diagnostic-provider';
import { Type } from '../src/phpunit/common';
import { Range } from 'vscode-languageserver-types';

describe('DiagnosticProvider Test', () => {
    it('it should return diagnostic group', () => {
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();
        const range: Range = Range.create(1, 1, 1, 1);

        expect(
            diagnosticProvider.asDiagnosticGroup([
                {
                    name: 'passed',
                    class: 'PHPUnitTest',
                    classname: '',
                    uri: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                    range,
                    time: 0.006241,
                    type: Type.PASSED,
                },
                {
                    name: 'error',
                    class: 'PHPUnitTest',
                    classname: '',
                    uri: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                    range,
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
                                uri: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
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
                                        uri: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                                        range,
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
        const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();
        const range: Range = Range.create(1, 1, 1, 1);

        expect(
            diagnosticProvider.asDiagnosticGroup([
                {
                    name: 'passed',
                    class: 'PHPUnitTest',
                    classname: '',
                    uri: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                    range,
                    time: 0.006241,
                    type: Type.PASSED,
                },
            ])
        ).toEqual(new Map<string, any[]>([['file:///vscode-phpunit/tests/PHPUnitTest.php', []]]));
    });
});
