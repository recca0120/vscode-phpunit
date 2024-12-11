import { readFile } from 'fs/promises';
import { phpUnitProject } from '../__tests__/utils';
import { generateClassFQN, generateUniqueId, TestParser } from './TestParser';
import { TestDefinition, TestType } from './types';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    let suite: TestDefinition | undefined;
    const testParser = new TestParser();
    testParser.on(TestType.method, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.class, (testDefinition: TestDefinition) => suite = testDefinition);
    testParser.parse(buffer, file);

    return suite ? [{ ...suite, children: tests }] : tests;
};

describe('PHPUnitParser Test', () => {
    describe('PHPUnit', () => {
        let suites: TestDefinition[];
        const givenTest = (methodName: string) => {
            return suites[0].children!.find((test) => test.methodName === methodName);
        };

        describe('parse AssertionsTest', () => {
            const file = phpUnitProject('tests/AssertionsTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests';
            const className = 'AssertionsTest';

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('it should parse test_passed', () => {
                const methodName = 'test_passed';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 12, character: 4 },
                        end: { line: 15, character: 5 },
                    }),
                );
            });

            it('it should parse test_failed', () => {
                const methodName = 'test_failed';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        annotations: { depends: ['test_passed'] },
                        start: { line: 20, character: 4 },
                        end: { line: 23, character: 5 },
                        // end: { line: 20, character: 29 },
                    }),
                );
            });

            it('it should parse test_is_not_same', () => {
                const methodName = 'test_is_not_same';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 25, character: 4 },
                        end: { line: 28, character: 5 },
                        // end: { line: 25, character: 34 },
                    }),
                );
            });

            it('it should parse test_risky', () => {
                const methodName = 'test_risky';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 30, character: 4 },
                        end: { line: 33, character: 5 },
                        // end: { line: 30, character: 28 },
                    }),
                );
            });

            it('it should parse annotation_test', () => {
                const methodName = 'annotation_test';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 38, character: 4 },
                        end: { line: 41, character: 5 },
                    }),
                );
            });

            it('it should parse test_skipped', () => {
                const methodName = 'test_skipped';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 43, character: 4 },
                        end: { line: 46, character: 5 },
                    }),
                );
            });

            it('it should parse test_incomplete', () => {
                const methodName = 'test_incomplete';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 48, character: 4 },
                        end: { line: 51, character: 5 },
                    }),
                );
            });

            it('it should parse addition_provider', () => {
                const methodName = 'addition_provider';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        annotations: {
                            dataProvider: ['additionProvider'],
                            depends: ['test_passed'],
                        },
                        start: { line: 60, character: 4 },
                        end: { line: 63, character: 5 },
                    }),
                );
            });

            it('it should parse testdox annotation', () => {
                const methodName = 'balanceIsInitiallyZero';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        annotations: { testdox: ['has an initial balance of zero'] },
                        start: { line: 79, character: 4 },
                        end: { line: 82, character: 5 },
                    }),
                );
            });
        });

        describe('parse AbstractTest', () => {
            const file = phpUnitProject('tests/AbstractTest.php');

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('it should not parse abstract class', () => {
                expect(suites).toHaveLength(0);
            });
        });

        describe('parse StaticMethodTest', () => {
            const file = phpUnitProject('tests/StaticMethodTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests';
            const className = 'StaticMethodTest';

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('it should parse test_static_public_fail', () => {
                const methodName = 'test_static_public_fail';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 9, character: 4 },
                        end: { line: 11, character: 5 },
                    }),
                );

                expect(suites).toHaveLength(1);
            });
        });

        describe('parse HasPropertyTest', () => {
            const file = phpUnitProject('tests/SubFolder/HasPropertyTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
            const className = 'HasPropertyTest';

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('it should parse property', () => {
                const methodName = 'property';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 17, character: 4 },
                        end: { line: 20, character: 5 },
                    }),
                );

                expect(suites).toHaveLength(1);
            });
        });

        describe('parse LeadingCommentsTest', () => {
            const file = phpUnitProject('tests/SubFolder/LeadingCommentsTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
            const className = 'LeadingCommentsTest';

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('it should parse firstLeadingComments', () => {
                const methodName = 'firstLeadingComments';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 10, character: 4 },
                        end: { line: 13, character: 5 },
                    }),
                );
            });
        });

        describe('parse UseTraitTest', () => {
            const file = phpUnitProject('tests/SubFolder/UseTraitTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
            const className = 'UseTraitTest';

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('it should parse use_trait', () => {
                const methodName = 'use_trait';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 12, character: 4 },
                        end: { line: 15, character: 5 },
                    }),
                );
            });
        });

        describe('parse AttributeTest', () => {
            const file = phpUnitProject('tests/AttributeTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests';
            const className = 'AttributeTest';

            beforeAll(async () => {
                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('parse Test Attribute', () => {
                const methodName = 'hi';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        start: { line: 14, character: 4 },
                        end: { line: 17, character: 5 },
                    }),
                );
            });

            it('parse DataProvider Attribute', () => {
                const methodName = 'testAdd';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        annotations: { dataProvider: ['additionProvider'] },
                        start: { line: 20, character: 4 },
                        end: { line: 23, character: 5 },
                    }),
                );
            });

            it('parse Depends Attribute', () => {
                const methodName = 'testPush';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        annotations: { depends: ['testEmpty'] },
                        start: { line: 44, character: 4 },
                        end: { line: 51, character: 5 },
                    }),
                );
            });

            it('parse TestDox Attribute', () => {
                const methodName = 'balanceIsInitiallyZero';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace,
                        className,
                        methodName,
                        annotations: { testdox: ['has an initial balance of zero'] },
                        start: { line: 55, character: 4 },
                        end: { line: 58, character: 5 },
                    }),
                );
            });
        });

        describe('parse NoNamespaceTest', () => {
            const file = phpUnitProject('tests/NoNamespaceTest.php');
            const namespace = '';
            const className = 'NoNamespaceTest';

            beforeAll(async () => {
                const file2 = phpUnitProject('tests/AttributeTest.php');
                const buffer2 = await readFile(file2);
                suites = parse(buffer2.toString(), file2)!;

                const buffer = await readFile(file);
                suites = parse(buffer.toString(), file)!;
            });

            it('parse NoNamespaceTest', () => {
                const methodName = 'test_no_namespace';

                expect(givenTest(methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id: generateUniqueId(namespace, className, methodName),
                        classFQN: generateClassFQN(namespace, className),
                        namespace: undefined,
                        className,
                        methodName,
                        start: { line: 7, character: 4 },
                        end: { line: 10, character: 5 },
                    }),
                );
            });
        });
    });
});
