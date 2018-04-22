import { Assertion, Collection, Test, Type } from '../../src/phpunit';
import { Diagnostic, PublishDiagnosticsParams, Range } from 'vscode-languageserver';
import { Filesystem, FilesystemContract } from '../../src/filesystem';
import { projectPath, projectUri } from '../helpers';

describe('Collection Test', () => {
    const files: FilesystemContract = new Filesystem();
    const path: string = projectPath('junit.xml');
    const uri: string = projectUri('tests/CalculatorTest.php');
    const tests: Test[] = [
        {
            uri: uri,
            range: {
                start: {
                    line: 56,
                    character: 8,
                },
                end: {
                    line: 56,
                    character: 38,
                },
            },
            name: 'test_throw_exception',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            time: 0.000157,
            type: Type.ERROR,
            fault: {
                type: 'Exception',
                message: 'Exception:',
                details: [
                    {
                        uri: projectUri('src/Calculator.php'),
                        range: {
                            start: {
                                line: 20,
                                character: 8,
                            },
                            end: {
                                line: 20,
                                character: 28,
                            },
                        },
                    },
                    {
                        uri: projectUri('tests/CalculatorTest.php'),
                        range: {
                            start: {
                                line: 10,
                                character: 8,
                            },
                            end: {
                                line: 10,
                                character: 28,
                            },
                        },
                    },
                ],
            },
        },
    ];

    it('it should put tests and remove same tests', () => {
        const collect: Collection = new Collection();

        const oldTests: Test[] = [
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(9, 1, 9, 1),
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_2',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(19, 1, 19, 1),
                time: 1,
                type: Type.PASSED,
            },
        ];

        collect.put(oldTests);

        expect(collect.get('foo')).toEqual([
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(9, 1, 9, 1),
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_2',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(19, 1, 19, 1),
                time: 1,
                type: Type.PASSED,
            },
        ]);

        const newTests: Test[] = [
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.PASSED,
            },
            {
                name: 'method_3',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(29, 1, 29, 1),
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                uri: files.uri('bar'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.PASSED,
            },
        ];

        collect.put(newTests);

        expect(collect.get('foo')).toEqual([
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.PASSED,
            },
            {
                name: 'method_2',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(19, 1, 19, 1),
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_3',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(29, 1, 29, 1),
                time: 1,
                type: Type.PASSED,
            },
        ]);

        expect(collect.get('bar')).toEqual([
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                uri: files.uri('bar'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.PASSED,
            },
        ]);
    });

    it('it should get diagnostics', () => {
        const collect: Collection = new Collection();
        collect.put(tests);

        const diagnostics: Map<string, Diagnostic[]> = collect.asDiagnoics();

        expect(diagnostics.get(uri)[0]).toEqual({
            severity: 1,
            source: 'PHPUnit',
            message: 'Exception:',
            range: {
                end: {
                    character: 28,
                    line: 10,
                },
                start: {
                    character: 8,
                    line: 10,
                },
            },
            relatedInformation: [],
        });
    });

    it('it should get assertions', async () => {
        const collect: Collection = new Collection();
        collect.put(tests);

        const assertionGroup: Map<string, Assertion[]> = collect.asAssertions();
        let assertions: Assertion[] = assertionGroup.get(uri);

        expect(assertions[0]).toEqual({
            uri: uri,
            range: {
                end: {
                    character: 38,
                    line: 56,
                },
                start: {
                    character: 8,
                    line: 56,
                },
            },
            related: {
                class: 'Tests\\CalculatorTest',
                classname: 'Tests.CalculatorTest',
                name: 'test_throw_exception',
                time: 0.000157,
                type: 'error',
                uri: uri,
                fault: {
                    message: 'Exception:',
                    type: 'Exception',
                },
                range: {
                    end: {
                        character: 38,
                        line: 56,
                    },
                    start: {
                        character: 8,
                        line: 56,
                    },
                },
            },
        });

        expect(assertions[1]).toEqual({
            uri: uri,
            range: {
                end: {
                    character: 28,
                    line: 10,
                },
                start: {
                    character: 8,
                    line: 10,
                },
            },
            related: {
                class: 'Tests\\CalculatorTest',
                classname: 'Tests.CalculatorTest',
                name: 'test_throw_exception',
                time: 0.000157,
                type: 'error',
                uri: uri,
                fault: {
                    message: 'Exception:',
                    type: 'Exception',
                },
                range: {
                    end: {
                        character: 38,
                        line: 56,
                    },
                    start: {
                        character: 8,
                        line: 56,
                    },
                },
            },
        });

        assertions = assertionGroup.get(projectUri('src/Calculator.php'));

        expect(assertions[0]).toEqual({
            uri: projectUri('src/Calculator.php'),
            range: {
                end: {
                    character: 28,
                    line: 20,
                },
                start: {
                    character: 8,
                    line: 20,
                },
            },
            related: {
                class: 'Tests\\CalculatorTest',
                classname: 'Tests.CalculatorTest',
                name: 'test_throw_exception',
                time: 0.000157,
                type: 'error',
                uri: uri,
                fault: {
                    message: 'Exception:',
                    type: 'Exception',
                },
                range: {
                    end: {
                        character: 38,
                        line: 56,
                    },
                    start: {
                        character: 8,
                        line: 56,
                    },
                },
            },
        });
    });

    it('it should get state', () => {
        const collect: Collection = new Collection();
        collect.put([
            {
                name: 'method_1',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.PASSED,
            },
            {
                name: 'method_3',
                class: 'foo',
                classname: 'string',
                uri: files.uri('foo'),
                range: Range.create(29, 1, 29, 1),
                time: 1,
                type: Type.PASSED,
            },
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                uri: files.uri('bar'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.PASSED,
            },
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                uri: files.uri('bar'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.WARNING,
            },
            {
                name: 'method_1',
                class: 'bar',
                classname: 'string',
                uri: files.uri('bar'),
                range: Range.create(9, 1, 9, 1),
                time: 2,
                type: Type.FAILED,
            },
        ]);

        expect(collect.asState()).toEqual({
            failed: 1,
            passed: 3,
            warning: 1,
        });
    });
});
