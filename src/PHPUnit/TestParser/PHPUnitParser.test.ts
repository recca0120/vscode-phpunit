import { readFile } from 'fs/promises';
import { phpUnitProject } from '../__tests__/utils';
import { TestDefinition, TestType } from '../types';
import { TestParser } from './TestParser';

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
    const findTest = (tests: TestDefinition[], id: string) => {
        const lookup = {
            [TestType.method]: (test: TestDefinition) => test.methodName === id,
            [TestType.class]: (test: TestDefinition) => test.className === id && !test.methodName,
            [TestType.namespace]: (test: TestDefinition) => test.classFQN === id && !test.className && !test.methodName,
        } as { [key: string]: Function };

        for (const [, fn] of Object.entries(lookup)) {
            const test = tests.find((test: TestDefinition) => fn(test));

            if (test) {
                return test;
            }
        }

        return undefined;
    };

    const givenTest = (file: string, content: string, id: string) => {
        return findTest(parse(content, file), id);
    };

    describe('AssertionsTest', () => {
        const file = phpUnitProject('tests/AssertionsTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('parse namespace', () => {
            expect(givenTest(file, content, 'Recca0120\\VSCode\\Tests')).toEqual(expect.objectContaining({
                type: TestType.namespace,
                // file,
                id: 'namespace:Tests (Recca0120\\VSCode\\Tests)',
                classFQN: 'Recca0120\\VSCode\\Tests',
                namespace: 'Recca0120\\VSCode\\Tests',
                depth: 0,
            }));
        });

        it('parse class', () => {
            expect(givenTest(file, content, 'AssertionsTest')).toEqual(expect.objectContaining({
                type: TestType.class,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                start: { line: 8, character: 0 },
                end: { line: 83, character: 1 },
                depth: 1,
            }));
        });

        it('it should parse test_passed', () => {
            expect(givenTest(file, content, 'test_passed')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Passed',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'test_passed',
                start: { line: 12, character: 4 },
                end: { line: 15, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse test_failed', () => {
            expect(givenTest(file, content, 'test_failed')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Failed',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'test_failed',
                annotations: { depends: ['test_passed'] },
                start: { line: 20, character: 4 },
                end: { line: 23, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse test_is_not_same', () => {
            expect(givenTest(file, content, 'test_is_not_same')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Is not same',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'test_is_not_same',
                start: { line: 25, character: 4 },
                end: { line: 28, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse test_risky', () => {
            expect(givenTest(file, content, 'test_risky')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Risky',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'test_risky',
                start: { line: 30, character: 4 },
                end: { line: 33, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse annotation_test', () => {
            expect(givenTest(file, content, 'annotation_test')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Annotation test',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'annotation_test',
                start: { line: 38, character: 4 },
                end: { line: 41, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse test_skipped', () => {
            expect(givenTest(file, content, 'test_skipped')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Skipped',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'test_skipped',
                start: { line: 43, character: 4 },
                end: { line: 46, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse test_incomplete', () => {
            expect(givenTest(file, content, 'test_incomplete')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Incomplete',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'test_incomplete',
                start: { line: 48, character: 4 },
                end: { line: 51, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse addition_provider', () => {
            expect(givenTest(file, content, 'addition_provider')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'addition_provider',
                annotations: { dataProvider: ['additionProvider'], depends: ['test_passed'] },
                start: { line: 60, character: 4 },
                end: { line: 63, character: 5 },
                depth: 2,
            }));
        });

        it('it should parse testdox annotation', () => {
            expect(givenTest(file, content, 'balanceIsInitiallyZero')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Balance is initially zero',
                classFQN: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AssertionsTest',
                methodName: 'balanceIsInitiallyZero',
                annotations: { testdox: ['has an initial balance of zero'] },
                start: { line: 79, character: 4 },
                end: { line: 82, character: 5 },
                depth: 2,
            }));
        });
    });

    describe('parse AbstractTest', () => {
        const file = phpUnitProject('tests/AbstractTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('it should not parse abstract class', () => {
            expect(parse(content, file)).toHaveLength(0);
        });
    });

    describe('parse StaticMethodTest', () => {
        const file = phpUnitProject('tests/StaticMethodTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('StaticMethodTest should has 3 tests', () => {
            expect(parse(content, file)).toHaveLength(3);
        });

        it('it should parse test_static_public_fail', () => {
            expect(givenTest(file, content, 'test_static_public_fail')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Static Method (Recca0120\\VSCode\\Tests\\StaticMethod)::Static public fail',
                classFQN: 'Recca0120\\VSCode\\Tests\\StaticMethodTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'StaticMethodTest',
                methodName: 'test_static_public_fail',
                start: { line: 9, character: 4 },
                end: { line: 11, character: 5 },
                depth: 2,
            }));
        });
    });

    describe('parse HasPropertyTest', () => {
        const file = phpUnitProject('tests/SubFolder/HasPropertyTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('HasPropertyTest should has 3 tests', () => {
            expect(parse(content, file)).toHaveLength(3);
        });

        it('it should parse property', () => {
            expect(givenTest(file, content, 'property')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Has Property (Recca0120\\VSCode\\Tests\\SubFolder\\HasProperty)::Property',
                classFQN: 'Recca0120\\VSCode\\Tests\\SubFolder\\HasPropertyTest',
                namespace: 'Recca0120\\VSCode\\Tests\\SubFolder',
                className: 'HasPropertyTest',
                methodName: 'property',
                start: { line: 17, character: 4 },
                end: { line: 20, character: 5 },
                depth: 2,
            }));
        });
    });

    describe('parse LeadingCommentsTest', () => {
        const file = phpUnitProject('tests/SubFolder/LeadingCommentsTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('it should parse firstLeadingComments', () => {
            expect(givenTest(file, content, 'firstLeadingComments')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Leading Comments (Recca0120\\VSCode\\Tests\\SubFolder\\LeadingComments)::First leading comments',
                classFQN: 'Recca0120\\VSCode\\Tests\\SubFolder\\LeadingCommentsTest',
                namespace: 'Recca0120\\VSCode\\Tests\\SubFolder',
                className: 'LeadingCommentsTest',
                methodName: 'firstLeadingComments',
                start: { line: 10, character: 4 },
                end: { line: 13, character: 5 },
                depth: 2,
            }));
        });
    });

    describe('parse UseTraitTest', () => {
        const file = phpUnitProject('tests/SubFolder/UseTraitTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('it should parse use_trait', () => {
            expect(givenTest(file, content, 'use_trait')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Use Trait (Recca0120\\VSCode\\Tests\\SubFolder\\UseTrait)::Use trait',
                classFQN: 'Recca0120\\VSCode\\Tests\\SubFolder\\UseTraitTest',
                namespace: 'Recca0120\\VSCode\\Tests\\SubFolder',
                className: 'UseTraitTest',
                methodName: 'use_trait',
                start: { line: 12, character: 4 },
                end: { line: 15, character: 5 },
                depth: 2,
            }));
        });
    });

    describe('parse AttributeTest', () => {
        const file = phpUnitProject('tests/AttributeTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('parse Test Attribute', () => {
            expect(givenTest(file, content, 'hi')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Hi',
                classFQN: 'Recca0120\\VSCode\\Tests\\AttributeTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AttributeTest',
                methodName: 'hi',
                start: { line: 14, character: 4 },
                end: { line: 17, character: 5 },
                depth: 2,
            }));
        });

        it('parse DataProvider Attribute', () => {
            expect(givenTest(file, content, 'testAdd')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Add',
                classFQN: 'Recca0120\\VSCode\\Tests\\AttributeTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AttributeTest',
                methodName: 'testAdd',
                annotations: { dataProvider: ['additionProvider'] },
                start: { line: 20, character: 4 },
                end: { line: 23, character: 5 },
                depth: 2,
            }));
        });

        it('parse Depends Attribute', () => {
            expect(givenTest(file, content, 'testPush')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Push',
                classFQN: 'Recca0120\\VSCode\\Tests\\AttributeTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AttributeTest',
                methodName: 'testPush',
                annotations: { depends: ['testEmpty'] },
                start: { line: 44, character: 4 },
                end: { line: 51, character: 5 },
                depth: 2,
            }));
        });

        it('parse TestDox Attribute', () => {
            expect(givenTest(file, content, 'balanceIsInitiallyZero')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'Attribute (Recca0120\\VSCode\\Tests\\Attribute)::Balance is initially zero',
                classFQN: 'Recca0120\\VSCode\\Tests\\AttributeTest',
                namespace: 'Recca0120\\VSCode\\Tests',
                className: 'AttributeTest',
                methodName: 'balanceIsInitiallyZero',
                annotations: { testdox: ['has an initial balance of zero'] },
                start: { line: 55, character: 4 },
                end: { line: 58, character: 5 },
                depth: 2,
            }));
        });
    });

    describe('parse NoNamespaceTest', () => {
        const file = phpUnitProject('tests/NoNamespaceTest.php');
        let content: string;
        beforeAll(async () => content = (await readFile(file)).toString());

        it('parse NoNamespaceTest', () => {
            expect(givenTest(file, content, 'test_no_namespace')).toEqual(expect.objectContaining({
                type: TestType.method,
                file,
                id: 'No Namespace::No namespace',
                classFQN: 'NoNamespaceTest',
                namespace: undefined,
                className: 'NoNamespaceTest',
                methodName: 'test_no_namespace',
                start: { line: 7, character: 4 },
                end: { line: 10, character: 5 },
                depth: 2,
            }));
        });
    });

    it('has require', () => {
        const file = phpUnitProject('tests/PDF_testerTest.php');
        const content = `<?php declare(strict_types=1);
require_once "vendor/autoload.php";
use PHPUnit\\Framework\\TestCase;
final class PDF_testerTest extends TestCase {
    public function test_hello() {
        self::assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_hello')).toEqual(expect.objectContaining({
            type: TestType.method,
            file,
            id: 'PDF Tester::Hello',
            classFQN: 'PDF_testerTest',
            namespace: undefined,
            className: 'PDF_testerTest',
            methodName: 'test_hello',
            start: { line: 5, character: 4 },
            end: { line: 7, character: 5 },
            depth: 2,
        }));
    });
});
