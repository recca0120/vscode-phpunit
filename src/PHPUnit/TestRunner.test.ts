import 'jest';
import { describe } from '@jest/globals';
import { spawn } from 'child_process';
import * as semver from 'semver';
import { getPhpUnitVersion, phpUnitProject } from './__tests__/utils';
import { Command, LocalCommand, RemoteCommand } from './Command';
import { Configuration } from './Configuration';
import { Result, TestExtraResultEvent, TestResultEvent, TestResultKind } from './ProblemMatcher';
import { TestRunner } from './TestRunner';
import { TestRunnerEvent } from './TestRunnerObserver';

jest.mock('child_process');

interface ExpectedData {
    mock?: boolean;
    expected: any[];
    configuration: Configuration;
    command: Command;
    phpUnitProject: (path: string) => string;
    appPath: (path: string) => string;
}

describe('TestRunner Test', () => {
    const PHPUNIT_VERSION: string = getPhpUnitVersion();

    const onTestRunnerEvents = new Map<TestRunnerEvent, jest.Mock>([
        [TestRunnerEvent.run, jest.fn()],
        [TestRunnerEvent.line, jest.fn()],
        [TestRunnerEvent.result, jest.fn()],
        [TestRunnerEvent.close, jest.fn()],
        [TestRunnerEvent.error, jest.fn()],
    ]);

    const onTestResultEvents = new Map<TestResultKind, jest.Mock>([
        [TestExtraResultEvent.testVersion, jest.fn()],
        [TestExtraResultEvent.testRuntime, jest.fn()],
        [TestExtraResultEvent.testConfiguration, jest.fn()],
        [TestExtraResultEvent.testCount, jest.fn()],
        [TestExtraResultEvent.timeAndMemory, jest.fn()],
        [TestExtraResultEvent.testResultSummary, jest.fn()],
        [TestResultEvent.testSuiteStarted, jest.fn()],
        [TestResultEvent.testSuiteFinished, jest.fn()],
        [TestResultEvent.testStarted, jest.fn()],
        [TestResultEvent.testFailed, jest.fn()],
        [TestResultEvent.testIgnored, jest.fn()],
        [TestResultEvent.testFinished, jest.fn()],
    ]);
    const mockSpawn = (contents: string[]) => {
        const stdout = jest.fn().mockImplementation((_event, fn: (data: string) => void) => {
            contents.forEach((line) => fn(line + '\n'));
        });

        (spawn as jest.Mock).mockReturnValue({
            stdout: { on: stdout },
            stderr: { on: jest.fn() },
            on: jest.fn().mockImplementation((_event, fn: (data: number) => void) => {
                if (_event === 'close') {
                    fn(2);
                }
            }),
        });
    };

    const mockTestPassed = (data: ExpectedData) => {
        const { appPath } = data;

        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: ${appPath('phpunit.xml')}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testStarted name='test_passed' locationHint='${locationHint}::test_passed' flowId='8024']`,
            `##teamcity[testFinished name='test_passed' duration='0' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'Tests: 1, Assertions: 1, Failures: 1',
        ]);
    };

    const mockTestFailed = (data: ExpectedData) => {
        const { appPath } = data;

        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: ${appPath('phpunit.xml')}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testStarted name='test_failed' locationHint='${locationHint}::test_failed' flowId='8024']`,
            `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.|n|n${file}:5|n' details=' ${file}:22|n ' duration='0' flowId='8024']`,
            `##teamcity[testFinished name='test_failed' duration='0' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'Tests: 1, Assertions: 1, Failures: 1',
        ]);
    };

    const mockTestFailedWithPhpVfsComposer = (data: ExpectedData) => {
        const { appPath } = data;

        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;
        const phpVfsComposer = `phpvfscomposer://${appPath('vendor/phpunit/phpunit/phpunit')}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: ${appPath('phpunit.xml')}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testStarted name='test_failed' locationHint='${locationHint}::test_failed' flowId='8024']`,
            `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.|n|n${file}:5|n' details=' ${file}:22|n ${phpVfsComposer}:60 ' duration='0' flowId='8024']`,
            `##teamcity[testFinished name='test_failed' duration='0' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'Tests: 1, Assertions: 1, Failures: 1',
        ]);
    };

    const mockTestSuite = (data: ExpectedData) => {
        const { appPath } = data;

        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: ${appPath('phpunit.xml')}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testSuiteStarted name='${id}' locationHint='${locationHint}' flowId='8024']`,
            `##teamcity[testSuiteFinished name='${id}' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'OK (1 test, 1 assertion)',
        ]);
    };

    const expectedRun = async (data: ExpectedData) => {
        const { command, expected, phpUnitProject } = data;
        const testRunner = new TestRunner();

        onTestResultEvents.forEach((fn, eventName) => {
            testRunner.on(eventName, (test: Result) => fn(test));
        });

        onTestRunnerEvents.forEach((fn, eventName) => {
            testRunner.on(eventName, (test: Result) => fn(test));
        });

        await testRunner.run(command);

        const [cmd, ...args] = expected;

        expect(spawn).toHaveBeenCalledWith(cmd, args, { cwd: phpUnitProject('') });
    };

    const expectedTest = (expected: any, phpUnitProject: (path: string) => string) => {
        const locationHint = `php_qn://${expected.file}::\\${expected.id}`;

        const testResult = onTestRunnerEvents
            .get(TestRunnerEvent.result)!
            .mock.calls.find(
                (call: any) => call[0].id === expected.id && call[0].event === expected.event,
            );

        expect(testResult).not.toBeUndefined();

        if (expected.event === TestResultEvent.testFailed) {
            const hasFile = (pattern: string, l: number) => {
                return (testResult[0].details as { file: string; line: number }[]).some(
                    ({ file, line }) => !!file.match(new RegExp(pattern)) && line === l,
                );
            };

            if (hasFile('AssertionsTest', 5)) {
                expected.details = [
                    { file: phpUnitProject('tests/AssertionsTest.php'), line: 5 },
                    ...expected.details,
                ];
            }

            if (hasFile('phpunit', 60)) {
                expected.details = [
                    ...expected.details,
                    { file: phpUnitProject('vendor/phpunit/phpunit/phpunit'), line: 60 },
                ];
            }
            expect(testResult[0].details).toEqual(expected.details);
        }

        expect(testResult[0]).toEqual(expect.objectContaining({ ...expected, locationHint }));

        expect(onTestResultEvents.get(expected.event)).toHaveBeenCalledWith(
            expect.objectContaining({ ...expected, locationHint }),
        );

        if (semver.lt(PHPUNIT_VERSION, '10.0.0')) {
            expect(onTestResultEvents.get(TestExtraResultEvent.testVersion)).toHaveBeenCalled();
            // expect(onTestResultEvents.get(TestExtraResultEvent.testRuntime)).toHaveBeenCalled();
            // expect(
            //     onTestResultEvents.get(TestExtraResultEvent.testConfiguration)
            // ).toHaveBeenCalled();
            expect(onTestResultEvents.get(TestExtraResultEvent.testCount)).toHaveBeenCalled();
            expect(onTestResultEvents.get(TestExtraResultEvent.timeAndMemory)).toHaveBeenCalled();
            expect(
                onTestResultEvents.get(TestExtraResultEvent.testResultSummary),
            ).toHaveBeenCalled();
        }

        expect(onTestRunnerEvents.get(TestRunnerEvent.run)).toHaveBeenCalled();
        expect(onTestRunnerEvents.get(TestRunnerEvent.close)).toHaveBeenCalled();
    };

    const generateExceptedByCommand = (command: Command, expected: any[], inputs: unknown[]) => {
        if (command instanceof RemoteCommand) {
            inputs = [
                (inputs as string[])
                    .map((input) => (/^-/.test(input) ? `'${input}'` : input))
                    .join(' '),
            ];
        }

        return [...expected, ...inputs];
    };

    async function shouldRunAllTests(data: ExpectedData) {
        const { configuration, command, expected, phpUnitProject, appPath } = data;

        let inputs = [
            configuration.get('php'),
            configuration.get('phpunit'),
            `--configuration=${appPath('phpunit.xml')}`,
            '--colors=never',
            '--teamcity',
        ];

        await expectedRun({
            ...data,
            expected: generateExceptedByCommand(command, expected, inputs),
        });

        expectedTest(
            {
                event: TestResultEvent.testFinished,
                name: 'test_passed',
                flowId: expect.any(Number),
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                file: phpUnitProject('tests/AssertionsTest.php'),
            },
            phpUnitProject,
        );
    }

    async function shouldRunTestSuite(data: ExpectedData) {
        let { configuration, expected, command, phpUnitProject, appPath } = data;
        const args = `${phpUnitProject('tests/AssertionsTest.php')}`;

        const inputs = [
            configuration.get('php'),
            configuration.get('phpunit'),
            `--configuration=${appPath('phpunit.xml')}`,
            appPath('tests/AssertionsTest.php'),
            '--colors=never',
            '--teamcity',
        ];

        await expectedRun({
            ...data,
            command: command.setArguments(args),
            expected: generateExceptedByCommand(command, expected, inputs),
        });

        expectedTest(
            {
                event: TestResultEvent.testSuiteFinished,
                name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                flowId: expect.any(Number),
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                file: phpUnitProject('tests/AssertionsTest.php'),
            },
            phpUnitProject,
        );
    }

    async function shouldRunTestPassed(data: ExpectedData) {
        let { configuration, expected, command, phpUnitProject, appPath } = data;

        const name = 'test_passed';
        const filter = `^.*::(${name})( with data set .*)?$`;
        const file = phpUnitProject('tests/AssertionsTest.php');
        const args = `${file} --filter "${filter}"`;

        const inputs = [
            configuration.get('php'),
            configuration.get('phpunit'),
            `--configuration=${appPath('phpunit.xml')}`,
            `--filter=${filter}`,
            appPath('tests/AssertionsTest.php'),
            '--colors=never',
            '--teamcity',
        ];

        await expectedRun({
            ...data,
            command: command.setArguments(args),
            expected: generateExceptedByCommand(command, expected, inputs),
        });

        expectedTest(
            {
                event: TestResultEvent.testFinished,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: phpUnitProject('tests/AssertionsTest.php'),
            },
            phpUnitProject,
        );
    }

    async function shouldRunTestFailed(data: ExpectedData) {
        let { configuration, expected, command, phpUnitProject, appPath } = data;

        const name = 'test_failed';
        const filter = `^.*::(test_passed|test_failed)( with data set .*)?$`;
        const file = phpUnitProject('tests/AssertionsTest.php');
        const args = `${file} --filter "${filter}"`;

        const inputs = [
            configuration.get('php'),
            configuration.get('phpunit'),
            `--configuration=${appPath('phpunit.xml')}`,
            `--filter=${filter}`,
            appPath('tests/AssertionsTest.php'),
            '--colors=never',
            '--teamcity',
        ];

        await expectedRun({
            ...data,
            command: command.setArguments(args),
            expected: generateExceptedByCommand(command, expected, inputs),
        });

        expectedTest(
            {
                event: TestResultEvent.testFailed,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: phpUnitProject('tests/AssertionsTest.php'),
                message: 'Failed asserting that false is true.',
                details: [{ file: phpUnitProject('tests/AssertionsTest.php'), line: 22 }],
                duration: expect.any(Number),
            },
            phpUnitProject,
        );
    }

    it('run error command', async () => {
        const appPath = phpUnitProject;
        const configuration = new Configuration({
            php: 'foo',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', '${PWD}/phpunit.xml'],
        });
        const command = new LocalCommand(configuration, { cwd: phpUnitProject('') });
        const expected = [
            'foo',
            'vendor/bin/phpunit',
            `--configuration=${phpUnitProject('phpunit.xml')}`,
            '--colors=never',
            '--teamcity',
        ];

        await expectedRun({ configuration, command, expected, phpUnitProject, appPath });

        expect(onTestRunnerEvents.get(TestRunnerEvent.error)!).toHaveBeenCalledTimes(1);
        expect(onTestRunnerEvents.get(TestRunnerEvent.close)!).toHaveBeenCalledTimes(1);
    });

    const dataSet = [
        ((): [string, ExpectedData] => {
            const appPath = (path: string) => phpUnitProject(path);

            const configuration = new Configuration({
                php: 'php',
                phpunit: 'vendor/bin/phpunit',
                args: ['-c', '${workspaceFolder}/phpunit.xml'],
            });

            return [
                'PHPUnit',
                {
                    mock: false,
                    configuration,
                    command: new LocalCommand(configuration, { cwd: phpUnitProject('') }),
                    appPath,
                    phpUnitProject,
                    expected: [],
                },
            ];
        })(),
        ((): [string, ExpectedData] => {
            const appPath = (path: string) => `/app/${path}`;

            const configuration = new Configuration({
                command:
                    'ssh -i dockerfiles/sshd/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no',
                php: 'php',
                phpunit: appPath('vendor/bin/phpunit'),
                args: ['-c', appPath('phpunit.xml')],
                paths: { [phpUnitProject('')]: '/app' },
            });

            return [
                'ssh',
                {
                    mock: true,
                    configuration,
                    command: new RemoteCommand(configuration, { cwd: phpUnitProject('') }),
                    appPath,
                    phpUnitProject,
                    expected: [
                        'ssh',
                        '-i',
                        'dockerfiles/sshd/id_rsa',
                        '-p',
                        '2222',
                        'root@localhost',
                        '-o',
                        'StrictHostKeyChecking=no',
                    ],
                },
            ];
        })(),
        ((): [string, ExpectedData] => {
            const appPath = (path: string) => `/app/${path}`;

            const configuration = new Configuration({
                command: 'docker run -i --rm -v ${PWD}:/app -w /app phpunit-stub',
                php: 'php',
                phpunit: 'vendor/bin/phpunit',
                args: ['-c', '${PWD}/phpunit.xml'],
                paths: { [phpUnitProject('')]: '/app' },
            });

            return [
                'Docker',
                {
                    mock: true,
                    configuration,
                    command: new RemoteCommand(configuration, { cwd: phpUnitProject('') }),
                    appPath,
                    phpUnitProject,
                    expected: [
                        'docker',
                        'run',
                        '-i',
                        '--rm',
                        '-v',
                        `${phpUnitProject('')}:/app`,
                        '-w',
                        '/app',
                        'phpunit-stub',
                    ],
                },
            ];
        })(),
        ((): [string, ExpectedData] => {
            const phpUnitProject = (path: string) =>
                `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
            const appPath = (path: string) => `./${path}`;

            const configuration = new Configuration({
                command: 'docker run -i --rm -v ${workspaceFolder}:/app -w /app phpunit-stub',
                php: 'php',
                phpunit: 'vendor/bin/phpunit',
                args: ['-c', '${PWD}/phpunit.xml'],
                paths: { [phpUnitProject('')]: '.' },
            });

            return [
                'Docker for Windows',
                {
                    mock: true,
                    configuration,
                    command: new RemoteCommand(configuration, { cwd: phpUnitProject('') }),
                    appPath,
                    phpUnitProject,
                    expected: [
                        'docker',
                        'run',
                        '-i',
                        '--rm',
                        '-v',
                        `${phpUnitProject('')}:/app`,
                        '-w',
                        '/app',
                        'phpunit-stub',
                    ],
                },
            ];
        })(),
    ];
    describe.each(dataSet)('%s', (_name, data) => {
        const { mock } = data;

        beforeEach(() => {
            jest.restoreAllMocks();
        });

        it('should run all tests', async () => {
            if (mock) {
                mockTestPassed(data);
            }

            await shouldRunAllTests(data);
        });

        it('should run test suite', async () => {
            if (mock) {
                mockTestSuite(data);
            }

            await shouldRunTestSuite(data);
        });

        it('should run test passed', async () => {
            if (mock) {
                mockTestPassed(data);
            }

            await shouldRunTestPassed(data);
        });

        it('should run test failed', async () => {
            if (mock) {
                mockTestFailed(data);
            }

            await shouldRunTestFailed(data);
        });

        it('should run test failed with phpvfscomposer', async () => {
            mockTestFailedWithPhpVfsComposer(data);

            await shouldRunTestFailed(data);
        });
    });
});