import { Message, Parser, State } from '../src/parser'

import { join } from 'path'

describe('Parser', () => {
    const parser: Parser = new Parser()

    async function getMessage(key: number): Message {
        const messages: Message[] = await parser.parseXML(join(__dirname, 'fixtures/junit.xml'))

        return messages[key]
    }

    it('it should parse passed', async () => {
        const message = await getMessage(0)

        expect(message).toEqual({
            duration: 0.006241,
            error: {
                fullMessage: '',
                message: '',
                name: '',
            },
            fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 12,
            state: State.PASSED,
            title: 'testPassed',
        })
    })

    it('it should parse failed', async () => {
        const message = await getMessage(1)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.001918,
                error: {
                    fullMessage: jasmine.anything(),
                    message: 'Failed asserting that false is true.',
                    name: '',
                    // name: 'PHPUnit_Framework_ExpectationFailedException',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 19,
                state: State.FAILED,
                title: 'testFailed',
            })
        )
    })

    it('it should parse error', async () => {
        const message = await getMessage(2)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.001087,
                error: {
                    fullMessage: jasmine.anything(),
                    message:
                        'Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                    name: '',
                    // name: 'PHPUnit_Framework_Exception',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 24,
                state: State.FAILED,
                title: 'testError',
            })
        )
    })

    it('it should parse skipped', async () => {
        const message = await getMessage(3)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.001138,
                error: {
                    fullMessage: jasmine.anything(),
                    message: 'Skipped Test',
                    name: '',
                    // name: 'PHPUnit_Framework_SkippedTestError',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 29,
                state: State.SKIPPED,
                title: 'testSkipped',
            })
        )
    })

    it('it should parse incomplete', async () => {
        const message = await getMessage(4)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.001081,
                error: {
                    fullMessage: jasmine.anything(),
                    message: 'Incomplete Test',
                    name: '',
                    // name: 'PHPUnit_Framework_IncompleteTestError',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 34,
                state: State.INCOMPLETED,
                title: 'testIncomplete',
            })
        )
    })

    it('it should parse exception', async () => {
        const message = await getMessage(5)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.164687,
                error: {
                    fullMessage: jasmine.anything(),
                    message:
                        'Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object',
                    name: '',
                    // name: 'BadMethodCallException',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 44,
                state: State.FAILED,
                title: 'testReceive',
            })
        )
    })

    it('it should get current error message when mockery call not correct.', async () => {
        const message = await getMessage(6)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.008761,
                error: {
                    fullMessage: jasmine.anything(),
                    message:
                        'Method delete("C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php") ' +
                        'from Mockery_1_Recca0120_Upload_Filesystem should be called\n exactly 1 times but called 0 times.',
                    name: '',
                    // name: 'Mockery\\Exception\\InvalidCountException',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 12,
                state: State.FAILED,
                title: 'testCleanDirectory',
            })
        )
    })

    it('it should be skipped when testcase has skipped tag', async () => {
        const message = await getMessage(7)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.001352,
                error: {
                    fullMessage: jasmine.anything(),
                    message: '',
                    name: '',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 22,
                state: State.SKIPPED,
                title: 'testSkipped',
            })
        )
    })

    it('it should be skipped when testcase has skipped tag', async () => {
        const message = await getMessage(8)

        expect(message).toEqual(
            jasmine.objectContaining({
                duration: 0.000954,
                error: {
                    fullMessage: jasmine.anything(),
                    message: '',
                    name: '',
                },
                fileName: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
                lineNumber: 27,
                state: State.SKIPPED,
                title: 'testIncomplete',
            })
        )
    })
})
