import { JUnitParser } from '../../src/phpunit/junit-parser';
import { Type, Test } from '../../src/phpunit/common';
import { Textline } from '../../src/support/textline';
import { Range } from 'vscode-languageserver-types';

describe('JUnitParser Test', () => {
    it('it should be passed', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="passed" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="13" assertions="1" time="0.006241"/>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'passed',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 13,
            time: 0.006241,
            type: Type.PASSED,
            range,
        });
    });

    it('it should be failed', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="failed" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="18" assertions="1" time="0.001918">
            <failure type="PHPUnit_Framework_ExpectationFailedException">PHPUnitTest::failed&#13;
Failed asserting that false is true.
&#13;
/vscode-phpunit/tests/PHPUnitTest.php:20
            </failure>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'failed',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 18,
            time: 0.001918,
            type: Type.FAILURE,
            range,
            fault: {
                type: 'PHPUnit_Framework_ExpectationFailedException',
                message: ['PHPUnitTest::failed', 'Failed asserting that false is true.'].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                        line: 20,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be error', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <<testcase name="error" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="23" assertions="0" time="0.001087">
            <error type="PHPUnit_Framework_Exception">PHPUnitTest::error&#13;
PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name
&#13;
/vscode-phpunit/tests/PHPUnitTest.php:25
            </error>
      </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'error',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 23,
            time: 0.001087,
            type: Type.ERROR,
            range,
            fault: {
                type: 'PHPUnit_Framework_Exception',
                message: [
                    'PHPUnitTest::error',
                    'PHPUnit_Framework_Exception: Argument #1 (No Value) of PHPUnit_Framework_Assert::assertInstanceOf() must be a class or interface name',
                ].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                        line: 25,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be skipped', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="skipped" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="28" assertions="0" time="0.001138">
            <error type="PHPUnit_Framework_SkippedTestError">Skipped Test
/vscode-phpunit/tests/PHPUnitTest.php:30
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'skipped',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 28,
            time: 0.001138,
            type: Type.SKIPPED,
            range,
            fault: {
                type: 'PHPUnit_Framework_SkippedTestError',
                message: ['Skipped Test'].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                        line: 30,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be incomplete', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="incomplete" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="33" assertions="0" time="0.001081">
            <error type="PHPUnit_Framework_IncompleteTestError">Incomplete Test
/vscode-phpunit/tests/PHPUnitTest.php:35
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'incomplete',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 33,
            time: 0.001081,
            type: Type.INCOMPLETE,
            range,
            fault: {
                type: 'PHPUnit_Framework_IncompleteTestError',
                message: ['Incomplete Test'].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                        line: 35,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be error when bad method call exception', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="bad_method_call_exception" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="18" assertions="0" time="0.164687">
            <error type="BadMethodCallException">PHPUnitTest::bad_method_call_exception&#13;
BadMethodCallException: Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object
&#13;
/vscode-phpunit/src/Receiver.php:85
/vscode-phpunit/src/Receiver.php:68
/vscode-phpunit/tests/PHPUnitTest.php:45
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'bad_method_call_exception',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 18,
            time: 0.164687,
            type: Type.ERROR,
            range,
            fault: {
                type: 'BadMethodCallException',
                message: [
                    'PHPUnitTest::bad_method_call_exception',
                    'BadMethodCallException: Method Mockery_1_Symfony_Component_HttpFoundation_File_UploadedFile::getClientOriginalName() does not exist on this mock object',
                ].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/src/Receiver.php',
                        line: 85,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/src/Receiver.php',
                        line: 68,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                        line: 45,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be error when bad method call exception', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="mockery_not_called" class="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="78" assertions="0" time="0.008761">
            <error type="Mockery\\Exception\\InvalidCountException">PHPUnitTest::mockery_not_called&#13;
Mockery\\Exception\\InvalidCountException: Method delete("/vscode-phpunit/tests/PHPUnitTest.php") from Mockery_1_Filesystem should be called&#13;
exactly 1 times but called 0 times.
&#13;
/vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php:37
/vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/Expectation.php:298
/vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/ExpectationDirector.php:120
/vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/Container.php:297
/vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/Container.php:282
/vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery.php:152
/vscode-phpunit/tests/PHPUnitTest.php:13
/vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php:188
/vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php:118
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'mockery_not_called',
            class: 'PHPUnitTest',
            classname: '',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 78,
            time: 0.008761,
            type: Type.ERROR,
            range,
            fault: {
                type: 'Mockery\\Exception\\InvalidCountException',
                message: [
                    'PHPUnitTest::mockery_not_called',
                    'Mockery\\Exception\\InvalidCountException: Method delete("/vscode-phpunit/tests/PHPUnitTest.php") from Mockery_1_Filesystem should be called',
                    'exactly 1 times but called 0 times.',
                ].join('\n'),
                details: [
                    {
                        file:
                            'file:///vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php',
                        line: 37,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/Expectation.php',
                        line: 298,
                        range,
                    },
                    {
                        file:
                            'file:///vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/ExpectationDirector.php',
                        line: 120,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/Container.php',
                        line: 297,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery/Container.php',
                        line: 282,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/mockery/mockery/library/Mockery.php',
                        line: 152,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
                        line: 13,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php',
                        line: 188,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php',
                        line: 118,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be incomplete when only has incomplete tag', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="incomplete" class="PHPUnitTest" classname="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="28" assertions="0" time="0.000954">
            <incomplete/>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'incomplete',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 28,
            time: 0.000954,
            type: Type.INCOMPLETE,
            range,
            fault: {
                type: 'PHPUnit\\Framework\\IncompleteTestError',
                message: ['Incomplete Test'].join('\n'),
                details: [],
            },
        });
    });

    it('it should be skipped when only has skipped tag', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="skipped" class="PHPUnitTest" classname="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="23" assertions="0" time="0.001352">
            <skipped/>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'skipped',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.SKIPPED,
            range,
            fault: {
                type: 'PHPUnit\\Framework\\SkippedTestError',
                message: ['Skipped Test'].join('\n'),
                details: [],
            },
        });
    });

    it('it should be risky', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="incomplete" class="PHPUnitTest" classname="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="28" assertions="0" time="0.000954">
            <incomplete/>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'incomplete',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 28,
            time: 0.000954,
            type: Type.INCOMPLETE,
            range,
            fault: {
                type: 'PHPUnit\\Framework\\IncompleteTestError',
                message: ['Incomplete Test'].join('\n'),
                details: [],
            },
        });
    });

    it('it should be incomplete when only has incomplete tag', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="risky" class="PHPUnitTest" classname="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="23" assertions="0" time="0.001352">
            <error type="PHPUnit\\Framework\\RiskyTestError">Risky Test
/vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php:195
/vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php:148
            </error>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'risky',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.RISKY,
            range,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: ['Risky Test'].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php',
                        line: 195,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php',
                        line: 148,
                        range,
                    },
                ],
            },
        });
    });

    it('it should be warning', async () => {
        const range: Range = Range.create(12, 5, 12, 10);
        const textline: Textline = new Textline();
        spyOn(textline, 'line').and.returnValue(range);

        const parser: JUnitParser = new JUnitParser(textline);

        const tests: Test[] = await parser.parse(`
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" tests="5" assertions="2" failures="1" errors="3" time="0.011465">
        <testcase name="warning" class="PHPUnitTest" classname="PHPUnitTest" file="/vscode-phpunit/tests/PHPUnitTest.php" line="23" assertions="0" time="0.001352">
            <warning type="PHPUnit\\Framework\\RiskyTestError">Risky Test
/vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php:195
/vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php:148
            </warning>
        </testcase>
    </testsuite>
</testsuites>
        `);

        expect(tests[0]).toEqual({
            name: 'warning',
            class: 'PHPUnitTest',
            classname: 'PHPUnitTest',
            file: 'file:///vscode-phpunit/tests/PHPUnitTest.php',
            line: 23,
            time: 0.001352,
            type: Type.WARNING,
            range,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: ['Risky Test'].join('\n'),
                details: [
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php',
                        line: 195,
                        range,
                    },
                    {
                        file: 'file:///vscode-phpunit/tests/vendor/phpunit/phpunit/src/TextUI/Command.php',
                        line: 148,
                        range,
                    },
                ],
            },
        });
    });
});
