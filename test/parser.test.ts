import * as assert from 'assert'

import { Parser } from '../src/parser'
import { join } from 'path'

suite('Parser Tests', () => {
    async function getMessages() {
        const parser = new Parser()
        const messages = await parser.parseXML(join(__dirname, '../../test/fixtures/junit.xml'))

        return messages
    }

    test('it should parse passed', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[0], {
            duration: 0.006241,
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 12,
            state: 'passed',
            title: 'testPassed',
        })
    })

    test('it should parse failed', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[1], {
            duration: 0.001918,
            error: {
                message: 'Failed asserting that false is true.',
                name: '',
                // name: 'PHPUnit_Framework_ExpectationFailedException',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 19,
            state: 'failed',
            title: 'testFailed',
        })
    })

    test('it should parse error', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[2], {
            duration: 0.001087,
            error: {
                message:
                    'Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                name: '',
                // name: 'PHPUnit_Framework_Exception',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 24,
            state: 'failed',
            title: 'testError',
        })
    })

    test('it should parse skipped', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[3], {
            duration: 0.001138,
            error: {
                message: 'Skipped Test',
                name: '',
                // name: 'PHPUnit_Framework_SkippedTestError',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 29,
            state: 'skipped',
            title: 'testSkipped',
        })
    })

    test('it should parse incomplete', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[4], {
            duration: 0.001081,
            error: {
                message: 'Incomplete Test',
                name: '',
                // name: 'PHPUnit_Framework_IncompleteTestError',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 34,
            state: 'incomplete',
            title: 'testIncomplete',
        })
    })

    test('it should parse exception', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[5], {
            duration: 0.164687,
            error: {
                message:
                    'Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object',
                name: '',
                // name: 'BadMethodCallException',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 44,
            state: 'failed',
            title: 'testReceive',
        })
    })

    test('it should get current error message when mockery call not correct.', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[6], {
            duration: 0.008761,
            error: {
                message:
                    'Method delete("C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php") ' +
                    'from Mockery_1_Recca0120_Upload_Filesystem should be called\n exactly 1 times but called 0 times.',
                name: '',
                // name: 'Mockery\\Exception\\InvalidCountException',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 12,
            state: 'failed',
            title: 'testCleanDirectory',
        })
    })

    test('it should be skipped when testcase has skipped tag', async () => {
        const messages = await getMessages()

        assert.deepEqual(messages[7], {
            duration: 0.001352,
            error: {
                message: '',
                name: '',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 22,
            state: 'skipped',
            title: 'testSkipped',
        })

        assert.deepEqual(messages[8], {
            duration: 0.000954,
            error: {
                message: '',
                name: '',
            },
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 27,
            state: 'skipped',
            title: 'testIncomplete',
        })
    })
})
