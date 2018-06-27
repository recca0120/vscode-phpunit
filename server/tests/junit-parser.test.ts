import { JUnitParser } from '../src/junit-parser';
import { Factory as FilesystemFactory, Filesystem } from '../src/filesystem';
import { Type, Test } from '../src/common';

describe('JUnitParser Test', () => {
    it('it should be passed', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="passed" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="13" assertions="1" time="0.006241"/>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'passed',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 13,
            time: 0.006241,
            type: Type.PASSED,
        });
    });

    it('it should be failed', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="failed" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="18" assertions="1" time="0.001918">
            <failure type="PHPUnit_Framework_ExpectationFailedException">PHPUnitTest::failed&#13;
Failed asserting that false is true.
&#13;
C:\\vscode-phpunit\\tests\\PHPUnitTest.php:20
            </failure>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'failed',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 18,
            time: 0.001918,
            type: Type.FAILURE,
            fault: {
                type: 'PHPUnit_Framework_ExpectationFailedException',
                message: ['PHPUnitTest::failed', 'Failed asserting that false is true.'].join('\n'),
                details: [
                    {
                        file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
                        line: 20,
                    },
                ],
            },
        });
    });

    it('it should be error', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <<testcase name="error" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="23" assertions="0" time="0.001087">
            <error type="PHPUnit_Framework_Exception">PHPUnitTest::error&#13;
PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name
&#13;
C:\\vscode-phpunit\\tests\\PHPUnitTest.php:25
            </error>
      </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'error',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 23,
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
                        file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
                        line: 25,
                    },
                ],
            },
        });
    });

    it('it should be skipped', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="skipped" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="28" assertions="0" time="0.001138">
            <error type="PHPUnit_Framework_SkippedTestError">Skipped Test
C:\\vscode-phpunit\\tests\\PHPUnitTest.php:30
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'skipped',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 28,
            time: 0.001138,
            type: Type.SKIPPED,
            fault: {
                type: 'PHPUnit_Framework_SkippedTestError',
                message: ['Skipped Test'].join('\n'),
                details: [
                    {
                        file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
                        line: 30,
                    },
                ],
            },
        });
    });

    it('it should be incomplete', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="incomplete" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="33" assertions="0" time="0.001081">
            <error type="PHPUnit_Framework_IncompleteTestError">Incomplete Test
C:\\vscode-phpunit\\tests\\PHPUnitTest.php:35
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'incomplete',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 33,
            time: 0.001081,
            type: Type.INCOMPLETE,
            fault: {
                type: 'PHPUnit_Framework_IncompleteTestError',
                message: ['Incomplete Test'].join('\n'),
                details: [
                    {
                        file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
                        line: 35,
                    },
                ],
            },
        });
    });

    it('it should be error when bad method call exception', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="bad_method_call_exception" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="18" assertions="0" time="0.164687">
            <error type="BadMethodCallException">PHPUnitTest::bad_method_call_exception&#13;
BadMethodCallException: Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object
&#13;
C:\\vscode-phpunit\\src\\Receiver.php:85
C:\\vscode-phpunit\\src\\Receiver.php:68
C:\\vscode-phpunit\\tests\\PHPUnitTest.php:45
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'bad_method_call_exception',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 18,
            time: 0.164687,
            type: Type.ERROR,
            fault: {
                type: 'BadMethodCallException',
                message: [
                    'PHPUnitTest::bad_method_call_exception',
                    'BadMethodCallException: Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object',
                ].join('\n'),
                details: [
                    {
                        file: 'C:\\vscode-phpunit\\src\\Receiver.php',
                        line: 85,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\src\\Receiver.php',
                        line: 68,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
                        line: 45,
                    },
                ],
            },
        });
    });

    it('it should be error when bad method call exception', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="mockery_not_called" class="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="78" assertions="0" time="0.008761">
            <error type="Mockery\\Exception\\InvalidCountException">PHPUnitTest::mockery_not_called&#13;
Mockery\\Exception\\InvalidCountException: Method delete("C:\\vscode-phpunit\\tests\\PHPUnitTest.php") from Mockery_1_Filesystem should be called&#13;
exactly 1 times but called 0 times.
&#13;
C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:37
C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:298
C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:120
C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:297
C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:282
C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery.php:152
C:\\vscode-phpunit\\tests\\PHPUnitTest.php:13
C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php:188
C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php:118
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'mockery_not_called',
            class: 'PHPUnitTest',
            classname: '',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 78,
            time: 0.008761,
            type: Type.ERROR,
            fault: {
                type: 'Mockery\\Exception\\InvalidCountException',
                message: [
                    'PHPUnitTest::mockery_not_called',
                    'Mockery\\Exception\\InvalidCountException: Method delete("C:\\vscode-phpunit\\tests\\PHPUnitTest.php") from Mockery_1_Filesystem should be called',
                    'exactly 1 times but called 0 times.',
                ].join('\n'),
                details: [
                    {
                        file:
                            'C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                        line: 37,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                        line: 298,
                    },
                    {
                        file:
                            'C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                        line: 120,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 297,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 282,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\mockery\\mockery\\library\\Mockery.php',
                        line: 152,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
                        line: 13,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 188,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 118,
                    },
                ],
            },
        });
    });

    it('it should be incomplete when only has incomplete tag', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="incomplete" class="PHPUnitTest" classname="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="28" assertions="0" time="0.000954">
            <incomplete/>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'incomplete',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 28,
            time: 0.000954,
            type: Type.INCOMPLETE,
            fault: {
                type: 'PHPUnit\\Framework\\IncompleteTestError',
                message: ['Incomplete Test'].join('\n'),
                details: [],
            },
        });
    });

    it('it should be skipped when only has skipped tag', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="skipped" class="PHPUnitTest" classname="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="23" assertions="0" time="0.001352">
            <skipped/>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'skipped',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.SKIPPED,
            fault: {
                type: 'PHPUnit\\Framework\\SkippedTestError',
                message: ['Skipped Test'].join('\n'),
                details: [],
            },
        });
    });

    it('it should be risky', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="incomplete" class="PHPUnitTest" classname="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="28" assertions="0" time="0.000954">
            <incomplete/>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'incomplete',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 28,
            time: 0.000954,
            type: Type.INCOMPLETE,
            fault: {
                type: 'PHPUnit\\Framework\\IncompleteTestError',
                message: ['Incomplete Test'].join('\n'),
                details: [],
            },
        });
    });

    it('it should be incomplete when only has incomplete tag', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="risky" class="PHPUnitTest" classname="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="23" assertions="0" time="0.001352">
            <error type="PHPUnit\\Framework\\RiskyTestError">Risky Test
C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php:195
C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php:148
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'risky',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.RISKY,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: ['Risky Test'].join('\n'),
                details: [
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 195,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 148,
                    },
                ],
            },
        });
    });

    it('it should be warning', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const parser: JUnitParser = new JUnitParser();

        const test: Test = parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="warning" class="PHPUnitTest" classname="PHPUnitTest" file="C:\\vscode-phpunit\\tests\\PHPUnitTest.php" line="23" assertions="0" time="0.001352">
            <warning type="PHPUnit\\Framework\\RiskyTestError">Risky Test
C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php:195
C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php:148
            </warning>
        </testcase>
    </testsuite>
</testsuites>
        `)[0];

        expect(test).toEqual({
            name: 'warning',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'C:\\vscode-phpunit\\tests\\PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.WARNING,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: ['Risky Test'].join('\n'),
                details: [
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 195,
                    },
                    {
                        file: 'C:\\vscode-phpunit\\tests\\vendor\\phpunit\\phpunit\\src\\TextUI\\Command.php',
                        line: 148,
                    },
                ],
            },
        });
    });
});
