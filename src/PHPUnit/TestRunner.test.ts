import { spawn } from 'child_process';
import * as semver from 'semver';
import { getPhpUnitVersion, phpUnitProject, phpUnitProjectWin } from './__tests__/utils';
import { Builder } from './CommandBuilder';
import { Configuration } from './Configuration';
import { TeamcityEvent } from './ProblemMatcher';
import { TestRunner } from './TestRunner';
import { TestRunnerEvent } from './TestRunnerObserver';
import { TransformerFactory } from './Transformer';
import { TestType } from './types';

const PHPUNIT_VERSION: string = getPhpUnitVersion();

jest.mock('child_process');

const onTestRunnerEvents = new Map<TestRunnerEvent, jest.Mock>([
    [TestRunnerEvent.run, jest.fn()],
    [TestRunnerEvent.line, jest.fn()],
    [TestRunnerEvent.result, jest.fn()],
    [TestRunnerEvent.close, jest.fn()],
    [TestRunnerEvent.error, jest.fn()],
]);

const onTestResultEvents = new Map<TeamcityEvent, jest.Mock>([
    [TeamcityEvent.testVersion, jest.fn()],
    [TeamcityEvent.testRuntime, jest.fn()],
    [TeamcityEvent.testConfiguration, jest.fn()],
    [TeamcityEvent.testCount, jest.fn()],
    [TeamcityEvent.testDuration, jest.fn()],
    [TeamcityEvent.testResultSummary, jest.fn()],
    [TeamcityEvent.testSuiteStarted, jest.fn()],
    [TeamcityEvent.testSuiteFinished, jest.fn()],
    [TeamcityEvent.testStarted, jest.fn()],
    [TeamcityEvent.testFailed, jest.fn()],
    [TeamcityEvent.testIgnored, jest.fn()],
    [TeamcityEvent.testFinished, jest.fn()],
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

function expectedTestResult(expected: any, projectPath: (path: string) => string): void {
    const [classFQN, methodName] = expected.id.split('::');
    const locationHint = `php_qn://${expected.file}::\\${expected.id}`;
    const type = !methodName ? TestType.class : TestType.method;
    const converter = TransformerFactory.factory(classFQN);
    expected.id = converter.uniqueId({ type, classFQN, methodName });

    const actual = onTestRunnerEvents.get(TestRunnerEvent.result)!.mock.calls.find((call: any) => {
        return call[0].id === expected.id && call[0].event === expected.event;
    });

    expect(actual).not.toBeUndefined();

    if (expected.event === TeamcityEvent.testFailed) {
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


    expect(actual[0]).toEqual(
        expect.objectContaining({ ...expected, locationHint }),
    );
    expect(onTestResultEvents.get(expected.event)).toHaveBeenCalledWith(
        expect.objectContaining({ ...expected, locationHint }),
    );

    if (semver.lt(PHPUNIT_VERSION, '10.0.0')) {
        expect(onTestResultEvents.get(TeamcityEvent.testVersion)).toHaveBeenCalled();
        // expect(onTestResultEvents.get(TestResultEvent.testRuntime)).toHaveBeenCalled();
        // expect(onTestResultEvents.get(TestResultEvent.testConfiguration)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TeamcityEvent.testCount)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TeamcityEvent.testDuration)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TeamcityEvent.testResultSummary)).toHaveBeenCalled();
    }

    expect(onTestRunnerEvents.get(TestRunnerEvent.run)).toHaveBeenCalled();
    expect(onTestRunnerEvents.get(TestRunnerEvent.close)).toHaveBeenCalled();
}

const generateTestResult = (
    testResult: { event: TeamcityEvent; name?: string; file: string; id: string; phpVfsComposer?: boolean },
    appPath: (path: string) => string,
    phpVfsComposer: boolean = false,
) => {
    let { event, name, file, id } = testResult;
    const locationHint = `php_qn://${file}::\\${id}`;
    const phpUnitXml = appPath('phpunit.xml');

    if ([TeamcityEvent.testSuiteStarted, TeamcityEvent.testSuiteFinished].includes(event)) {
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

    if ([TeamcityEvent.testStarted, TeamcityEvent.testFinished].includes(event)) {
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

    if ([TeamcityEvent.testFailed].includes(event)) {
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

const expectedCommand = async (builder: Builder, expected: string[]) => {
    const testRunner = new TestRunner();
    onTestResultEvents.forEach((fn, eventName) => testRunner.on(eventName, (test: any) => fn(test)));
    onTestRunnerEvents.forEach((fn, eventName) => testRunner.on(eventName, (test: any) => fn(test)));
    await testRunner.run(builder).run();

    const call = (spawn as jest.Mock).mock.calls[0];
    expect([call[0], ...call[1]]).toEqual(expected);
};

const shouldRunTest = async (
    expected: string[],
    builder: Builder,
    projectPath: (path: string) => string,
    appPath: (path: string) => string,
    start: { event: TeamcityEvent, name?: string, file: string, id: string, phpVfsComposer?: boolean, },
    finished: any,
) => {
    generateTestResult(start, appPath, start.phpVfsComposer);

    await expectedCommand(builder, expected);

    expectedTestResult(finished, projectPath);
};

const shouldRunAllTest = async (expected: string[], builder: Builder, projectPath: (path: string) => string, appPath: (path: string) => string) => {
    await shouldRunTest(expected, builder, projectPath, appPath, {
        event: TeamcityEvent.testStarted,
        name: 'test_passed',
        file: appPath('tests/AssertionsTest.php'),
        id: 'Tests\\AssertionsTest',
    }, {
        event: TeamcityEvent.testFinished,
        name: 'test_passed',
        flowId: expect.any(Number),
        id: 'Tests\\AssertionsTest::test_passed',
        file: projectPath('tests/AssertionsTest.php'),
    });
};

const shouldRunTestSuite = async (expected: string[], builder: Builder, projectPath: (uri: string) => string, appPath: (path: string) => string) => {
    builder.setArguments(projectPath('tests/AssertionsTest.php'));

    await shouldRunTest(expected, builder, projectPath, appPath, {
        event: TeamcityEvent.testSuiteStarted,
        file: appPath('tests/AssertionsTest.php'),
        id: 'Tests\\AssertionsTest',
    }, {
        event: TeamcityEvent.testSuiteFinished,
        flowId: expect.any(Number),
        id: 'Tests\\AssertionsTest',
        file: projectPath('tests/AssertionsTest.php'),
    });
};

const shouldRunTestPassed = async (expected: string[], builder: Builder, projectPath: (path: string) => string, appPath: (path: string) => string) => {
    const filter = `^.*::(test_passed)( with data set .*)?$`;
    builder.setArguments(`${projectPath('tests/AssertionsTest.php')} --filter "${filter}"`);

    await shouldRunTest(expected, builder, projectPath, appPath, {
        event: TeamcityEvent.testStarted,
        name: 'test_passed',
        file: appPath('tests/AssertionsTest.php'),
        id: 'Tests\\AssertionsTest',
    }, {
        event: TeamcityEvent.testFinished,
        flowId: expect.any(Number),
        id: 'Tests\\AssertionsTest::test_passed',
        file: projectPath('tests/AssertionsTest.php'),
    });
};

const shouldRunTestFailed = async (expected: string[], builder: Builder, projectPath: (uri: string) => string, appPath: (path: string) => string, phpVfsComposer: boolean = false) => {
    const filter = `^.*::(test_passed|test_failed)( with data set .*)?$`;
    builder.setArguments(`${projectPath('tests/AssertionsTest.php')} --filter "${filter}"`);

    await shouldRunTest(expected, builder, projectPath, appPath, {
        event: TeamcityEvent.testFailed,
        name: 'test_failed',
        file: appPath('tests/AssertionsTest.php'),
        id: 'Tests\\AssertionsTest',
        phpVfsComposer,
    }, {
        event: TeamcityEvent.testFailed,
        flowId: expect.any(Number),
        id: 'Tests\\AssertionsTest::test_failed',
        file: projectPath('tests/AssertionsTest.php'),
        message: 'Failed asserting that false is true.',
        details: [{ file: projectPath('tests/AssertionsTest.php'), line: 22 }],
    });
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

        const builder = new Builder(configuration, { cwd });
        const expected = [
            'foo',
            'vendor/bin/phpunit',
            `--configuration=${phpUnitProject('phpunit.xml')}`,
            '--colors=never',
            '--teamcity',
        ];
        await expectedCommand(builder, expected);

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
        const builder = new Builder(configuration, { cwd });

        it('should run all tests', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunAllTest(expected, builder, projectPath, appPath);
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

            await shouldRunTestSuite(expected, builder, projectPath, appPath);
        });

        it('should run test passed', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestPassed(expected, builder, projectPath, appPath);
        });

        it('should run test failed', async () => {
            const expected = [
                'php',
                appPath('vendor/bin/phpunit'),
                `--configuration=${appPath('phpunit.xml')}`,
                `--filter=^.*::(test_passed|test_failed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath);
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
        const builder = new Builder(configuration, { cwd });

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
                    `--configuration=${appPath('phpunit.xml')}`,
                    `--colors=never`,
                    `--teamcity`,
                ].join(' '),
            ];

            await shouldRunAllTest(expected, builder, projectPath, appPath);
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
                    `--configuration=${appPath('phpunit.xml')}`,
                    appPath('tests/AssertionsTest.php'),
                    `--colors=never`,
                    `--teamcity`,
                ].join(' '),
            ];

            await shouldRunTestSuite(expected, builder, projectPath, appPath);
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
                    `--configuration=${appPath('phpunit.xml')}`,
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    appPath('tests/AssertionsTest.php'),
                    `--colors=never`,
                    `--teamcity`,
                ].join(' '),
            ];

            await shouldRunTestPassed(expected, builder, projectPath, appPath);
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
                    `--configuration=${appPath('phpunit.xml')}`,
                    `'--filter=^.*::(test_passed|test_failed)( with data set .*)?$'`,
                    appPath('tests/AssertionsTest.php'),
                    `--colors=never`,
                    `--teamcity`,
                ].join(' '),
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath);
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
                    `--configuration=${appPath('phpunit.xml')}`,
                    `'--filter=^.*::(test_passed|test_failed)( with data set .*)?$'`,
                    appPath('tests/AssertionsTest.php'),
                    `--colors=never`,
                    `--teamcity`,
                ].join(' '),
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath, true);
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

        const builder = new Builder(configuration, { cwd });

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

            await shouldRunAllTest(expected, builder, projectPath, appPath);
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

            await shouldRunTestSuite(expected, builder, projectPath, appPath);
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
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestPassed(expected, builder, projectPath, appPath);
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
                `--filter=^.*::(test_passed|test_failed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath);
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
                `--filter=^.*::(test_passed|test_failed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath, true);
        });
    });

    describe('Windows Docker', () => {
        const projectPath = phpUnitProjectWin;
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
        const builder = new Builder(configuration, { cwd });

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

            await shouldRunAllTest(expected, builder, projectPath, appPath);
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

            await shouldRunTestSuite(expected, builder, projectPath, appPath);
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
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestPassed(expected, builder, projectPath, appPath);
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
                `--filter=^.*::(test_passed|test_failed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath);
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
                `--filter=^.*::(test_passed|test_failed)( with data set .*)?$`,
                appPath('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ];

            await shouldRunTestFailed(expected, builder, projectPath, appPath, true);
        });
    });
});