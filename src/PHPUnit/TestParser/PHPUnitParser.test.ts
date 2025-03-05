import { readFile } from 'fs/promises';
import { phpUnitProject } from '../__tests__/utils';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestDefinition, TestType } from '../types';
import { TestParser } from './TestParser';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(phpUnitProject(''));
    const testParser = new TestParser(phpUnitXML);
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
            expect(givenTest(file, content, 'Tests')).toEqual(expect.objectContaining({
                type: TestType.namespace,
                // file,
                id: 'namespace:Tests',
                classFQN: 'Tests',
                namespace: 'Tests',
                depth: 0,
            }));
        });

        it('parse class', () => {
            expect(givenTest(file, content, 'AssertionsTest')).toEqual(expect.objectContaining({
                type: TestType.class,
                file,
                id: 'Assertions (Tests\\Assertions)',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Passed',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Failed',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Is not same',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Risky',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Annotation test',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Skipped',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Incomplete',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Addition provider',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Assertions (Tests\\Assertions)::Balance is initially zero',
                classFQN: 'Tests\\AssertionsTest',
                namespace: 'Tests',
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
                id: 'Static Method (Tests\\StaticMethod)::Static public fail',
                classFQN: 'Tests\\StaticMethodTest',
                namespace: 'Tests',
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
                id: 'Has Property (Tests\\SubFolder\\HasProperty)::Property',
                classFQN: 'Tests\\SubFolder\\HasPropertyTest',
                namespace: 'Tests\\SubFolder',
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
                id: 'Leading Comments (Tests\\SubFolder\\LeadingComments)::First leading comments',
                classFQN: 'Tests\\SubFolder\\LeadingCommentsTest',
                namespace: 'Tests\\SubFolder',
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
                id: 'Use Trait (Tests\\SubFolder\\UseTrait)::Use trait',
                classFQN: 'Tests\\SubFolder\\UseTraitTest',
                namespace: 'Tests\\SubFolder',
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
                id: 'Attribute (Tests\\Attribute)::Hi',
                classFQN: 'Tests\\AttributeTest',
                namespace: 'Tests',
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
                id: 'Attribute (Tests\\Attribute)::Add',
                classFQN: 'Tests\\AttributeTest',
                namespace: 'Tests',
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
                id: 'Attribute (Tests\\Attribute)::Push',
                classFQN: 'Tests\\AttributeTest',
                namespace: 'Tests',
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
                id: 'Attribute (Tests\\Attribute)::Balance is initially zero',
                classFQN: 'Tests\\AttributeTest',
                namespace: 'Tests',
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
                className: 'NoNamespaceTest',
                methodName: 'test_no_namespace',
                label: 'test_no_namespace',
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
            className: 'PDF_testerTest',
            methodName: 'test_hello',
            start: { line: 5, character: 4 },
            end: { line: 7, character: 5 },
            depth: 2,
        }));
    });

    it('fix const array problem', () => {
        const file = phpUnitProject('tests/ArrayConstTest.php');
        const content = `<?php declare(strict_types=1);
        
use PHPUnit\\Framework\\TestCase;

final class ArrayConstTest extends TestCase {
    public const bool IS_EMAIL = true;

    public const array HTTP_EMAIL_TEMPLATE_RESPONSES = [
        'a' => 'b',
        'c' => 'd',
    ];
    
    public function test_hello() {
        self::assertTrue(true);
    }
}
`;
        expect(givenTest(file, content, 'test_hello')).toEqual(expect.objectContaining({
            type: TestType.method,
            file,
            id: 'Array Const::Hello',
            classFQN: 'ArrayConstTest',
            className: 'ArrayConstTest',
            methodName: 'test_hello',
            start: { line: expect.any(Number), character: 4 },
            end: { line: expect.any(Number), character: 5 },
            depth: 2,
        }));
    });

    it('ignore annotation string case', () => {
        const file = phpUnitProject('tests/TestDoxTest.php');
        const content = `<?php declare(strict_types=1);
        
use PHPUnit\\Framework\\TestCase;

final class TestDoxTest extends TestCase {
    /**
     * @testDox Do a test
     * @testWIth [1,1]
     *           [2,2]
     *           [3,3]
     */
    public function testAtTestWith($a,$b){
        $this->assertEquals($a,$b);
    }
}
`;
        expect(givenTest(file, content, 'testAtTestWith')).toEqual(expect.objectContaining({
            type: TestType.method,
            file,
            id: 'Test Dox::At test with',
            classFQN: 'TestDoxTest',
            className: 'TestDoxTest',
            methodName: 'testAtTestWith',
            label: 'Do a test',
            annotations: { 'testdox': ['Do a test'] },
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));
    });
});
