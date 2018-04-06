import { parse } from 'fast-xml-parser';
import { files } from '../../src/filesystem';
import { JUnit, Test, Type } from '../../src/phpunit';
import { resolve } from 'path';

describe('JUnit Test', () => {
    const jUnit: JUnit = new JUnit();
    let tests: Test[] = [];
    beforeEach(async () => {
        const content: string = await files.get(resolve(__dirname, '../fixtures/junit.xml'));
        tests = jUnit.parse(content);
    });

    it('passed', () => {
        expect(tests[0]).toEqual({
            name: 'testPassed',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 13,
            time: 0.006241,
            type: Type.PASSED,
        });
    });

    it('failed', () => {
        expect(tests[1]).toEqual({
            name: 'testFailed',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 20,
            time: 0.001918,
            type: Type.FAILURE,
            fault: {
                type: 'PHPUnit_Framework_ExpectationFailedException',
                message: 'Failed asserting that false is true.',
                details: [],
            },
        });
    });

    it('error', () => {
        expect(tests[2]).toEqual({
            name: 'testError',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 25,
            time: 0.001087,
            type: Type.ERROR,
            fault: {
                type: 'PHPUnit_Framework_Exception',
                message:
                    'Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                details: [],
            },
        });
    });

    it('skipped', () => {
        expect(tests[3]).toEqual({
            name: 'testSkipped',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 30,
            time: 0.001138,
            type: Type.SKIPPED,
            fault: {
                type: 'PHPUnit_Framework_SkippedTestError',
                message: 'Skipped Test',
                details: [],
            },
        });
    });

    it('incomplete', () => {
        expect(tests[4]).toEqual({
            name: 'testIncomplete',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 35,
            time: 0.001081,
            type: Type.INCOMPLETE,
            fault: {
                type: 'PHPUnit_Framework_IncompleteTestError',
                message: 'Incomplete Test',
                details: [],
            },
        });
    });

    it('exception', () => {
        expect(tests[5]).toEqual({
            name: 'testReceive',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 45,
            time: 0.164687,
            type: Type.ERROR,
            fault: {
                type: 'BadMethodCallException',
                message:
                    'Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object',
                details: [
                    {
                        file: 'C:\\Users\\recca\\github\\tester-phpunit\\src\\Receiver.php',
                        line: 85,
                    },
                    {
                        file: 'C:\\Users\\recca\\github\\tester-phpunit\\src\\Receiver.php',
                        line: 68,
                    },
                ],
            },
        });
    });

    it('current mockery call', () => {
        expect(tests[6]).toEqual({
            name: 'testCleanDirectory',
            class: 'Recca0120\\Upload\\Tests\\PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 13,
            time: 0.008761,
            type: Type.ERROR,
            fault: {
                type: 'Mockery\\Exception\\InvalidCountException',
                message: [
                    'Mockery\\Exception\\InvalidCountException: Method delete("C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php") from Mockery_1_Recca0120_Upload_Filesystem should be called',
                    ' exactly 1 times but called 0 times.',
                ].join('\n'),
                details: [
                    {
                        file:
                            'C:\\Users\\recca\\UniServerZ\\www\\driways\\laravel\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                        line: 37,
                    },
                    {
                        file:
                            'C:\\Users\\recca\\UniServerZ\\www\\driways\\laravel\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                        line: 298,
                    },
                    {
                        file:
                            'C:\\Users\\recca\\UniServerZ\\www\\driways\\laravel\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                        line: 120,
                    },
                    {
                        file:
                            'C:\\Users\\recca\\UniServerZ\\www\\driways\\laravel\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 297,
                    },
                    {
                        file:
                            'C:\\Users\\recca\\UniServerZ\\www\\driways\\laravel\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 282,
                    },
                    {
                        file:
                            'C:\\Users\\recca\\UniServerZ\\www\\driways\\laravel\\vendor\\mockery\\mockery\\library\\Mockery.php',
                        line: 152,
                    },
                    {
                        file: 'C:\\ProgramData\\ComposerSetup\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 188,
                    },
                    {
                        file: 'C:\\ProgramData\\ComposerSetup\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 118,
                    },
                ],
            },
        });
    });

    it('testcase has skipped tag', () => {
        expect(tests[7]).toEqual({
            name: 'testSkipped',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.SKIPPED,
            fault: {
                type: 'skipped',
                message: '',
                details: [],
            },
        });
    });

    it('testcase has incomplete tag', () => {
        expect(tests[8]).toEqual({
            name: 'testIncomplete',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 28,
            time: 0.000954,
            type: Type.SKIPPED,
            fault: {
                type: 'skipped',
                message: '',
                details: [],
            },
        });
    });

    it('risky', () => {
        expect(tests[9]).toEqual({
            name: 'testRisky',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 35,
            time: 0.205927,
            type: Type.RISKY,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: 'Risky Test',
                details: [
                    {
                        file: 'C:\\ProgramData\\ComposerSetup\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 195,
                    },
                    {
                        file: 'C:\\ProgramData\\ComposerSetup\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 148,
                    },
                ],
            },
        });
    });
});
