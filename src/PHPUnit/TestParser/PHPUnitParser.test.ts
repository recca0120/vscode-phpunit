import { readFile } from 'fs/promises';
import { phpUnitProject } from '../__tests__/utils';
import { TestParser } from './TestParser';
import { TestDefinition, TestType } from './types';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    const testParser = new TestParser();
    testParser.on(TestType.namespace, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.class, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.method, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.parse(buffer, file);

    return tests;
};

describe('PHPUnitParser Test', () => {
    describe('PHPUnit', () => {
        const findTest = (tests: TestDefinition[], methodName: string) => {
            const lookup = {
                [TestType.method]: (test: TestDefinition) => test.methodName === methodName,
                [TestType.class]: (test: TestDefinition) => test.className === methodName && !test.methodName,
                [TestType.namespace]: (test: TestDefinition) => test.classFQN === methodName && !test.className && !test.methodName,
            } as { [key: string]: Function };

            for (const [, fn] of Object.entries(lookup)) {
                const test = tests.find((test: TestDefinition) => fn(test));

                if (test) {
                    return test;
                }
            }

            return undefined;
        };

        const givenTests = async (file: string) => {
            const buffer = await readFile(file);

            return parse(buffer.toString(), file);
        };

        const givenTest = async (file: string, methodName: string) => {
            return findTest(await givenTests(file), methodName);
        };

        describe('parse AssertionsTest', () => {
            const file = phpUnitProject('tests/AssertionsTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests';
            const type = TestType.method;
            const className = 'AssertionsTest';
            const classFQN = `${namespace}\\${className}`;

            it('namespace', async () => {
                const methodName = 'Recca0120\\VSCode\\Tests';
                const id = 'namespace:Tests (Recca0120\\VSCode\\Tests)';

                expect(await givenTest(file, methodName)).toEqual(expect.objectContaining({
                    type: TestType.namespace,
                    id,
                    classFQN: methodName,
                    namespace: methodName,
                    depth: 1,
                }));
            });

            it('class', async () => {
                const methodName = 'AssertionsTest';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)';

                expect(await givenTest(file, methodName)).toEqual(expect.objectContaining({
                    type: TestType.class,
                    file,
                    id,
                    classFQN,
                    namespace,
                    className,
                    start: { line: 8, character: 0 },
                    end: { line: 83, character: 1 },
                    depth: 2,
                }));
            });

            it('it should parse test_passed', async () => {
                const methodName = 'test_passed';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Passed';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 12, character: 4 },
                        end: { line: 15, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse test_failed', async () => {
                const methodName = 'test_failed';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Failed';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        annotations: { depends: ['test_passed'] },
                        start: { line: 20, character: 4 },
                        end: { line: 23, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse test_is_not_same', async () => {
                const methodName = 'test_is_not_same';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Is not same';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 25, character: 4 },
                        end: { line: 28, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse test_risky', async () => {
                const methodName = 'test_risky';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Risky';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 30, character: 4 },
                        end: { line: 33, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse annotation_test', async () => {
                const methodName = 'annotation_test';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Annotation test';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 38, character: 4 },
                        end: { line: 41, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse test_skipped', async () => {
                const methodName = 'test_skipped';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Skipped';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 43, character: 4 },
                        end: { line: 46, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse test_incomplete', async () => {
                const methodName = 'test_incomplete';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Incomplete';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 48, character: 4 },
                        end: { line: 51, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse addition_provider', async () => {
                const methodName = 'addition_provider';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        annotations: {
                            dataProvider: ['additionProvider'],
                            depends: ['test_passed'],
                        },
                        start: { line: 60, character: 4 },
                        end: { line: 63, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('it should parse testdox annotation', async () => {
                const methodName = 'balanceIsInitiallyZero';
                const id = 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Balance is initially zero';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        annotations: { testdox: ['has an initial balance of zero'] },
                        start: { line: 79, character: 4 },
                        end: { line: 82, character: 5 },
                        depth: 3,
                    }),
                );
            });
        });

        describe('parse AbstractTest', () => {
            const file = phpUnitProject('tests/AbstractTest.php');

            it('it should not parse abstract class', async () => {
                expect(await givenTests(file)).toHaveLength(0);
            });
        });

        describe('parse StaticMethodTest', () => {
            const file = phpUnitProject('tests/StaticMethodTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests';
            const type = TestType.method;
            const className = 'StaticMethodTest';
            const classFQN = `${namespace}\\${className}`;

            it('it should parse test_static_public_fail', async () => {
                const methodName = 'test_static_public_fail';
                const id = 'Static Method (Recca0120\\VSCode\\Tests\\StaticMethod)::Static public fail';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 9, character: 4 },
                        end: { line: 11, character: 5 },
                        depth: 3,
                    }),
                );

                expect(await givenTests(file)).toHaveLength(3);
            });
        });

        describe('parse HasPropertyTest', () => {
            const file = phpUnitProject('tests/SubFolder/HasPropertyTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
            const type = TestType.method;
            const className = 'HasPropertyTest';
            const classFQN = `${namespace}\\${className}`;

            it('it should parse property', async () => {
                const methodName = 'property';
                const id = 'Has Property (Recca0120\\VSCode\\Tests\\SubFolder\\HasProperty)::Property';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 17, character: 4 },
                        end: { line: 20, character: 5 },
                        depth: 3,
                    }),
                );

                expect(await givenTests(file)).toHaveLength(3);
            });
        });

        describe('parse LeadingCommentsTest', () => {
            const file = phpUnitProject('tests/SubFolder/LeadingCommentsTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
            const type = TestType.method;
            const className = 'LeadingCommentsTest';
            const classFQN = `${namespace}\\${className}`;

            it('it should parse firstLeadingComments', async () => {
                const methodName = 'firstLeadingComments';
                const id = 'Leading Comments (Recca0120\\VSCode\\Tests\\SubFolder\\LeadingComments)::First leading comments';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 10, character: 4 },
                        end: { line: 13, character: 5 },
                        depth: 3,
                    }),
                );
            });
        });

        describe('parse UseTraitTest', () => {
            const file = phpUnitProject('tests/SubFolder/UseTraitTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
            const type = TestType.method;
            const className = 'UseTraitTest';
            const classFQN = `${namespace}\\${className}`;

            it('it should parse use_trait', async () => {
                const methodName = 'use_trait';
                const id = 'Use Trait (Recca0120\\VSCode\\Tests\\SubFolder\\UseTrait)::Use trait';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 12, character: 4 },
                        end: { line: 15, character: 5 },
                        depth: 3,
                    }),
                );
            });
        });

        describe('parse AttributeTest', () => {
            const file = phpUnitProject('tests/AttributeTest.php');
            const namespace = 'Recca0120\\VSCode\\Tests';
            const type = TestType.method;
            const className = 'AttributeTest';
            const classFQN = `${namespace}\\${className}`;

            it('parse Test Attribute', async () => {
                const methodName = 'hi';
                const id = 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Hi';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        start: { line: 14, character: 4 },
                        end: { line: 17, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('parse DataProvider Attribute', async () => {
                const methodName = 'testAdd';
                const id = 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Add';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        annotations: { dataProvider: ['additionProvider'] },
                        start: { line: 20, character: 4 },
                        end: { line: 23, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('parse Depends Attribute', async () => {
                const methodName = 'testPush';
                const id = 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Push';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        annotations: { depends: ['testEmpty'] },
                        start: { line: 44, character: 4 },
                        end: { line: 51, character: 5 },
                        depth: 3,
                    }),
                );
            });

            it('parse TestDox Attribute', async () => {
                const methodName = 'balanceIsInitiallyZero';
                const id = 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Balance is initially zero';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        file,
                        id,
                        classFQN,
                        namespace,
                        className,
                        methodName,
                        annotations: { testdox: ['has an initial balance of zero'] },
                        start: { line: 55, character: 4 },
                        end: { line: 58, character: 5 },
                        depth: 3,
                    }),
                );
            });
        });

        describe('parse NoNamespaceTest', () => {
            const file = phpUnitProject('tests/NoNamespaceTest.php');
            const type = TestType.method;
            const className = 'NoNamespaceTest';
            const classFQN = className;

            it('parse NoNamespaceTest', async () => {
                const methodName = 'test_no_namespace';
                await givenTests(phpUnitProject('tests/AttributeTest.php'));
                const id = 'No Namespace::No namespace';

                expect(await givenTest(file, methodName)).toEqual(
                    expect.objectContaining({
                        type,
                        file,
                        id,
                        classFQN,
                        namespace: undefined,
                        className,
                        methodName,
                        start: { line: 7, character: 4 },
                        end: { line: 10, character: 5 },
                        depth: 3,
                    }),
                );
            });
        });
    });
});
