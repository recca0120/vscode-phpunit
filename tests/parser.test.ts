import { Parser, TestCase, Type } from '../src/parser'

import { join } from 'path'

describe('Parser', () => {
    const parser: Parser = new Parser()

    async function getTestCase(key: number): Promise<TestCase> {
        const testCases: TestCase[] = await parser.parseXML(join(__dirname, 'fixtures/junit.xml'))

        return testCases[key]
    }

    it('it should parse passed', async () => {
        const testCase = await getTestCase(0)

        expect(testCase).toEqual({
            name: 'testPassed',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 12,
            time: 0.006241,
            type: Type.PASSED,
        })
    })

    it('it should parse failed', async () => {
        const testCase = await getTestCase(1)

        expect(testCase).toEqual({
            name: 'testFailed',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 19,
            time: 0.001918,
            type: Type.FAILURE,
            fault: {
                type: 'PHPUnit_Framework_ExpectationFailedException',
                message: ['PHPUnitTest::testFailed', 'Failed asserting that false is true.'].join('\n'),
                details: jasmine.anything(),
            },
        })
    })

    it('it should parse error', async () => {
        const testCase = await getTestCase(2)

        expect(testCase).toEqual({
            name: 'testError',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 24,
            time: 0.001087,
            type: Type.ERROR,
            fault: {
                type: 'PHPUnit_Framework_Exception',
                message: [
                    'PHPUnitTest::testError',
                    'PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                ].join('\n'),
                details: jasmine.anything(),
            },
        })
    })

    it('it should parse skipped', async () => {
        const testCase = await getTestCase(3)

        expect(testCase).toEqual({
            name: 'testSkipped',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 29,
            time: 0.001138,
            type: Type.SKIPPED,
            fault: {
                type: 'PHPUnit_Framework_SkippedTestError',
                message: 'Skipped Test',
                details: jasmine.anything(),
            },
        })
    })

    it('it should parse incomplete', async () => {
        const testCase = await getTestCase(4)

        expect(testCase).toEqual({
            name: 'testIncomplete',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 34,
            time: 0.001081,
            type: Type.INCOMPLETE,
            fault: {
                type: 'PHPUnit_Framework_IncompleteTestError',
                message: 'Incomplete Test',
                details: jasmine.anything(),
            },
        })
    })

    it('it should parse exception', async () => {
        const testCase = await getTestCase(5)

        expect(testCase).toEqual({
            name: 'testReceive',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 44,
            time: 0.164687,
            type: Type.ERROR,
            fault: {
                type: 'BadMethodCallException',
                message: [
                    'PHPUnitTest::testReceive',
                    'BadMethodCallException: Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object',
                ].join('\n'),
                details: jasmine.anything(),
            },
        })
    })

    it('it should get current error message when mockery call not correct.', async () => {
        const testCase = await getTestCase(6)

        expect(testCase).toEqual({
            name: 'testCleanDirectory',
            class: 'Recca0120\\Upload\\Tests\\PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 12,
            time: 0.008761,
            type: Type.ERROR,
            fault: {
                type: 'Mockery\\Exception\\InvalidCountException',
                message: [
                    'Recca0120\\Upload\\Tests\\PHPUnitTest::testCleanDirectory',
                    'Mockery\\Exception\\InvalidCountException: Method delete("C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php") from Mockery_1_Recca0120_Upload_Filesystem should be called',
                    ' exactly 1 times but called 0 times.',
                ].join('\n'),
                details: jasmine.anything(),
            },
        })
    })

    it('it should be skipped when testcase has skipped tag', async () => {
        const testCase = await getTestCase(7)

        expect(testCase).toEqual({
            name: 'testSkipped',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 22,
            time: 0.001352,
            type: Type.SKIPPED,
            fault: {
                type: 'skipped',
                message: '',
                details: jasmine.anything(),
            },
        })
    })

    it('it should be skipped when testcase has skipped tag', async () => {
        const testCase = await getTestCase(8)

        expect(testCase).toEqual({
            name: 'testIncomplete',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 27,
            time: 0.000954,
            type: Type.SKIPPED,
            fault: {
                type: 'skipped',
                message: '',
                details: jasmine.anything(),
            },
        })
    })
})
