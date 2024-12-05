import 'jest';
import { spawn } from 'child_process';
import * as semver from 'semver';
import { getPhpUnitVersion, phpUnitProject } from './__tests__/utils';
import { Command } from './Command';
import { Configuration } from './Configuration';
import { Result, TestExtraResultEvent, TestResult, TestResultEvent, TestResultKind } from './ProblemMatcher';
import { TestRunner } from './TestRunner';
import { TestRunnerEvent } from './TestRunnerObserver';
import Mock = jest.Mock;

const PHPUNIT_VERSION: string = getPhpUnitVersion();

jest.mock('child_process');

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

const fakeSpawn = (contents: string[]) => {
    const stdout = jest.fn().mockImplementation((_event, fn: (data: string) => void) => {
        contents.forEach((line) => fn(line + '\n'));
    });

    (spawn as jest.Mock).mockReturnValue({
        stdout: { on: stdout },
        stderr: { on: jest.fn() },
        on: jest.fn().mockImplementation((_event, callback: (data: number) => void) => {
            if (_event === 'close') {
                callback(2);
            }
        }),
    });
};

const hasFile = (
    testResult: { details: { file: string; line: number }[] }[],
    pattern: string,
    l: number,
) => (testResult[0].details).some(({ file, line }) => {
    return !!file.match(new RegExp(pattern)) && line === l;
});

const phpUnitProjectForWindows = (path: string) => `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');

function expectedTestResult(expected: TestResult, projectPath: (path: string) => string): void {
    const actual = onTestRunnerEvents.get(TestRunnerEvent.result)!.mock.calls.find(
        (call: any) => call[0].id === expected.id && call[0].event === expected.event,
    );

    expect(actual).not.toBeUndefined();

    if (expected.event === TestResultEvent.testFailed) {
        if (hasFile(actual, 'AssertionsTest', 5)) {
            expected.details = [{
                file: projectPath('tests/AssertionsTest.php'),
                line: 5,
            }, ...expected.details];
        }

        if (hasFile(actual, 'phpunit', 60)) {
            expected.details = [...expected.details, {
                file: projectPath('vendor/phpunit/phpunit/phpunit'),
                line: 60,
            }];
        }
        expect(actual[0].details).toEqual(expected.details);
    }

    const locationHint = `php_qn://${expected.file}::\\${expected.id}`;
    expect(actual[0]).toEqual(
        expect.objectContaining({ ...expected, locationHint }),
    );
    expect(onTestResultEvents.get(expected.event)).toHaveBeenCalledWith(
        expect.objectContaining({ ...expected, locationHint }),
    );

    if (semver.lt(PHPUNIT_VERSION, '10.0.0')) {
        expect(onTestResultEvents.get(TestExtraResultEvent.testVersion)).toHaveBeenCalled();
        // expect(onTestResultEvents.get(TestExtraResultEvent.testRuntime)).toHaveBeenCalled();
        // expect(onTestResultEvents.get(TestExtraResultEvent.testConfiguration)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TestExtraResultEvent.testCount)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TestExtraResultEvent.timeAndMemory)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TestExtraResultEvent.testResultSummary)).toHaveBeenCalled();
    }

    expect(onTestRunnerEvents.get(TestRunnerEvent.run)).toHaveBeenCalled();
    expect(onTestRunnerEvents.get(TestRunnerEvent.close)).toHaveBeenCalled();
}

const generateTestResult = (
    testResult: { event: TestResultEvent; name?: string; file: string; id: string; phpVfsComposer?: boolean },
    appPath: (path: string) => string,
    phpVfsComposer: boolean = false,
) => {
    let { event, name, file, id } = testResult;
    const locationHint = `php_qn://${file}::\\${id}`;
    const phpUnitXml = appPath('phpunit.xml');

    if ([TestResultEvent.testSuiteStarted, TestResultEvent.testSuiteFinished].includes(event)) {
        fakeSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: '${phpUnitXml}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testSuiteStarted name='${id}' locationHint='${locationHint}' flowId='8024']`,
            `##teamcity[testSuiteFinished name='${id}' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'OK (1 test, 1 assertion)',
        ]);
    }

    if ([TestResultEvent.testStarted, TestResultEvent.testFinished].includes(event)) {
        fakeSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: '${phpUnitXml}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testStarted name='${name}' locationHint='${locationHint}::${name}' flowId='8024']`,
            `##teamcity[testFinished name='${name}' duration='0' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'Tests: 1, Assertions: 1, Failures: 1',
        ]);
    }

    if ([TestResultEvent.testFailed].includes(event)) {
        let details = `${file}:22|n`;
        if (phpVfsComposer) {
            details += ` phpvfscomposer://${appPath('vendor/phpunit/phpunit/phpunit')}:60`;
        }
        fakeSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            'Runtime:       PHP 8.1.12',
            `Configuration: '${phpUnitXml}`,
            '##teamcity[testCount count=\'1\' flowId=\'8024\']',
            `##teamcity[testStarted name='${name}' locationHint='${locationHint}::test_failed' flowId='8024']`,
            `##teamcity[testFailed name='${name}' message='Failed asserting that false is true.|n|n${file}:5|n' details=' ${details} ' duration='0' flowId='8024']`,
            `##teamcity[testFinished name='${name}' duration='0' flowId='8024']`,
            'Time: 00:00.049, Memory: 6.00 MB',
            'Tests: 1, Assertions: 1, Failures: 1',
        ]);
    }
};

const expectedCommand = async (command: Command, expected: string[]) => {
    const testRunner = new TestRunner();
    onTestResultEvents.forEach((fn, eventName) => testRunner.on(eventName, (test: Result) => fn(test)));
    onTestRunnerEvents.forEach((fn, eventName) => testRunner.on(eventName, (test: Result) => fn(test)));
    await testRunner.run(command);

    const call = (spawn as Mock).mock.calls[0];
    expect([call[0], ...call[1]]).toEqual(expected);
};

const shouldRunTest = async (
    expected: string[],
    command: Command,
    projectPath: (path: string) => string,
    appPath: (path: string) => string,
    start: { event: TestResultEvent, name?: string, file: string, id: string, phpVfsComposer?: boolean, },
    finished: TestResult,
) => {
    generateTestResult(start, appPath, start.phpVfsComposer);

    await expectedCommand(command, expected);

    expectedTestResult(finished, projectPath);
};

const shouldRunAllTest = async (expected: string[], command: Command, projectPath: (path: string) => string, appPath: (path: string) => string) => {
    await shouldRunTest(expected, command, projectPath, appPath, {
        event: TestResultEvent.testStarted,
        name: 'test_passed',
        file: appPath('tests/AssertionsTest.php'),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
    }, {
        event: TestResultEvent.testFinished,
        name: 'test_passed',
        flowId: expect.any(Number),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
        file: projectPath('tests/AssertionsTest.php'),
    } as TestResult);
};

const shouldRunTestSuite = async (expected: string[], command: Command, projectPath: (uri: string) => string, appPath: (path: string) => string) => {
    command.setArguments(projectPath('tests/AssertionsTest.php'));

    await shouldRunTest(expected, command, projectPath, appPath, {
        event: TestResultEvent.testSuiteStarted,
        file: appPath('tests/AssertionsTest.php'),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
    }, {
        event: TestResultEvent.testSuiteFinished,
        flowId: expect.any(Number),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
        file: projectPath('tests/AssertionsTest.php'),
    } as TestResult);
};

const shouldRunTestPassed = async (expected: string[], command: Command, projectPath: (path: string) => string, appPath: (path: string) => string) => {
    const filter = `^.*::(test_passed)( with data set .*)?$`;
    command.setArguments(`${projectPath('tests/AssertionsTest.php')} --filter "${filter}"`);

    await shouldRunTest(expected, command, projectPath, appPath, {
        event: TestResultEvent.testStarted,
        name: 'test_passed',
        file: appPath('tests/AssertionsTest.php'),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
    }, {
        event: TestResultEvent.testFinished,
        flowId: expect.any(Number),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
        file: projectPath('tests/AssertionsTest.php'),
    } as TestResult);
};

const shouldRunTestFailed = async (expected: string[], command: Command, projectPath: (uri: string) => string, appPath: (path: string) => string, phpVfsComposer: boolean = false) => {
    const filter = `^.*::(test_passed|test_failed)( with data set .*)?$`;
    command.setArguments(`${projectPath('tests/AssertionsTest.php')} --filter "${filter}"`);

    await shouldRunTest(expected, command, projectPath, appPath, {
        event: TestResultEvent.testFailed,
        name: 'test_failed',
        file: appPath('tests/AssertionsTest.php'),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
        phpVfsComposer,
    }, {
        event: TestResultEvent.testFailed,
        flowId: expect.any(Number),
        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
        file: projectPath('tests/AssertionsTest.php'),
        message: 'Failed asserting that false is true.',
        details: [{ file: projectPath('tests/AssertionsTest.php'), line: 22 }],
    } as TestResult);
};

describe('TestRunner Test', () => {
    beforeEach(() => jest.restoreAllMocks());

    it('run error command', async () => {
        const cwd = phpUnitProject('');

        const configuration = new Configuration({
            php: 'foo',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', '${PWD}/phpunit.xml'],
        });

        const command = new Command(configuration, { cwd });
        const expected = [
            'foo',
            'vendor/bin/phpunit',
            `--configuration=${phpUnitProject('phpunit.xml')}`,
            '--colors=never',
            '--teamcity',
        ];
        await expectedCommand(command, expected);

        expect(onTestRunnerEvents.get(TestRunnerEvent.error)!).toHaveBeenCalledTimes(1);
        expect(onTestRunnerEvents.get(TestRunnerEvent.close)!).toHaveBeenCalledTimes(1);
    });

    describe('local', () => {
        const projectPath = phpUnitProject;
        const appPath = phpUnitProject;
        const cwd = projectPath('');
        const configuration = new Configuration({
            php: 'php',
            phpunit: '${workspaceFolder}/vendor/bin/phpunit',
            args: ['-c', '${workspaceFolder}/phpunit.xml'],
        });
        const command = new Command(configuration, { cwd });

        it('should run all tests', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunAllTest(expected, command, projectPath, appPath);
        });

        it('should run test suite', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestSuite(expected, command, projectPath, appPath);
        });

        it('should run test passed', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestPassed(expected, command, projectPath, appPath);
        });

        it('should run test failed', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed|test_failed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath);
        });

        it('should run test failed with phpvfscomposer for Docker', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed|test_failed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath, true);
        });
    });

    describe('SSH', () => {
        const projectPath = phpUnitProject;
        const appPath = (path?: string) => path ? `/app/${path}` : '/app';
        const cwd = projectPath('');
        const configuration = new Configuration({
            command: 'ssh -i dockerfiles/sshd/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no cd /app;',
            php: 'php',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', '/app/phpunit.xml'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            paths: { '${PWD}': appPath('') },
        });
        const command = new Command(configuration, { cwd });

        it('should run all tests for SSH', async () => {
            const expected = [
                'ssh',
                '-i',
                'dockerfiles/sshd/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                'cd',
                '/app;',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--configuration=${appPath('phpunit.xml')}'`,
                    `'--colors=never'`,
                    `'--teamcity'`,
                ].join(' '),
            ];

            await shouldRunAllTest(expected, command, projectPath, appPath);
        });

        it('should run test suite for SSH', async () => {
            const expected = [
                'ssh',
                '-i',
                'dockerfiles/sshd/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                'cd',
                '/app;',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--configuration=${appPath('phpunit.xml')}'`,
                    appPath('tests/AssertionsTest.php'),
                    `'--colors=never'`,
                    `'--teamcity'`,
                ].join(' '),
            ];

            await shouldRunTestSuite(expected, command, projectPath, appPath);
        });

        it('should run test passed for SSH', async () => {
            const expected = [
                'ssh',
                '-i',
                'dockerfiles/sshd/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                'cd',
                '/app;',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--configuration=${appPath('phpunit.xml')}'`,
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    appPath('tests/AssertionsTest.php'),
                    `'--colors=never'`,
                    `'--teamcity'`,
                ].join(' '),
            ];

            await shouldRunTestPassed(expected, command, projectPath, appPath);
        });

        it('should run test failed for SSH', async () => {
            const expected = [
                'ssh',
                '-i',
                'dockerfiles/sshd/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                'cd',
                '/app;',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--configuration=${appPath('phpunit.xml')}'`,
                    `'--filter=^.*::(test_passed|test_failed)( with data set .*)?$'`,
                    appPath('tests/AssertionsTest.php'),
                    `'--colors=never'`,
                    `'--teamcity'`,
                ].join(' '),
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath);
        });

        it('should run test failed with phpvfscomposer for Docker', async () => {
            const expected = [
                'ssh',
                '-i',
                'dockerfiles/sshd/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                'cd',
                '/app;',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--configuration=${appPath('phpunit.xml')}'`,
                    `'--filter=^.*::(test_passed|test_failed)( with data set .*)?$'`,
                    appPath('tests/AssertionsTest.php'),
                    `'--colors=never'`,
                    `'--teamcity'`,
                ].join(' '),
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath, true);
        });
    });

    describe('Docker', () => {
        const projectPath = phpUnitProject;
        const appPath = (path?: string) => path ? `/app/${path}` : '/app';
        const cwd = projectPath('');
        const configuration = new Configuration({
            command: 'docker run -i --rm -v ${workspaceFolder}:/app -w /app phpunit-stub',
            php: 'php',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', '${PWD}/phpunit.xml'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            paths: { '${PWD}': appPath('') },
        });

        const command = new Command(configuration, { cwd });

        it('should run all tests for Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunAllTest(expected, command, projectPath, appPath);
        });

        it('should run test suite for Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestSuite(expected, command, projectPath, appPath);
        });

        it('should run test passed for Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestPassed(expected, command, projectPath, appPath);
        });

        it('should run test failed for Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php', 'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed|test_failed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath);
        });

        it('should run test failed with phpvfscomposer for Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed|test_failed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath, true);
        });
    });

    describe('Windows Docker', () => {
        const projectPath = phpUnitProjectForWindows;
        const appPath = (path?: string) => (path ? `./${path}` : '.').replace(/\/g/, '\\');
        const cwd = projectPath('');
        const configuration = new Configuration({
            command: 'docker run -i --rm -v ${workspaceFolder}:/app -w /app phpunit-stub',
            php: 'php',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', '${PWD}/phpunit.xml'],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            paths: { '${PWD}': appPath('') },
        });
        const command = new Command(configuration, { cwd });

        it('should run all tests for Windows Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunAllTest(expected, command, projectPath, appPath);
        });

        it('should run test suite for Windows Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestSuite(expected, command, projectPath, appPath);
        });

        it('should run test passed for Windows Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestPassed(expected, command, projectPath, appPath);
        });

        it('should run test failed for Windows Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed|test_failed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath);
        });

        it('should run test failed with phpvfscomposer for Windows Docker', async () => {
            const expected = [
                'docker',
                'run',
                '-i',
                '--rm',
                '-v',
                `${projectPath('')}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                '--filter=^.*::(test_passed|test_failed)( with data set .*)?$',
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, command, projectPath, appPath, true);
        });
    });
});