import { spawn } from 'node:child_process';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { getPhpUnitVersion, phpUnitProject, phpUnitProjectWin } from '../../tests/utils';
import type { Path } from '../Configuration';
import { Configuration, PathReplacer } from '../Configuration';
import { VAR_PWD, VAR_WORKSPACE_FOLDER } from '../constants';
import { ProcessBuilder } from '../ProcessBuilder';
import { TestIdentifierFactory } from '../TestIdentifier';
import { TeamcityEvent } from '../TestOutput';
import { TestType } from '../types';
import { semverLt } from '../utils';
import { TestRunner } from './TestRunner';
import { TestRunnerEvent } from './TestRunnerObserver';

const PHPUNIT_VERSION: string = getPhpUnitVersion();

vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn(actual.spawn) };
});

const onTestRunnerEvents = new Map<TestRunnerEvent, Mock>([
    [TestRunnerEvent.run, vi.fn()],
    [TestRunnerEvent.line, vi.fn()],
    [TestRunnerEvent.result, vi.fn()],
    [TestRunnerEvent.close, vi.fn()],
    [TestRunnerEvent.error, vi.fn()],
]);

const onTestResultEvents = new Map<TeamcityEvent, Mock>([
    [TeamcityEvent.testVersion, vi.fn()],
    [TeamcityEvent.testRuntime, vi.fn()],
    [TeamcityEvent.testConfiguration, vi.fn()],
    [TeamcityEvent.testCount, vi.fn()],
    [TeamcityEvent.testDuration, vi.fn()],
    [TeamcityEvent.testResultSummary, vi.fn()],
    [TeamcityEvent.testSuiteStarted, vi.fn()],
    [TeamcityEvent.testSuiteFinished, vi.fn()],
    [TeamcityEvent.testStarted, vi.fn()],
    [TeamcityEvent.testFailed, vi.fn()],
    [TeamcityEvent.testIgnored, vi.fn()],
    [TeamcityEvent.testFinished, vi.fn()],
]);

const fakeSpawn = (contents: string[]) => {
    const stdout = vi.fn().mockImplementation((_event, fn: (data: string) => void) => {
        for (const line of contents) {
            fn(`${line}\n`);
        }
    });

    (spawn as Mock).mockReturnValue({
        stdout: { on: stdout },
        stderr: { on: vi.fn() },
        on: vi.fn().mockImplementation((_event, callback: (data: number) => void) => {
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
) =>
    testResult[0].details.some(({ file, line }) => {
        return !!file.match(new RegExp(pattern)) && line === l;
    });

const resolveTestId = (rawId: string) => {
    const [classFQN, methodName] = rawId.split('::');
    const type = !methodName ? TestType.class : TestType.method;
    return TestIdentifierFactory.create(classFQN).uniqueId({ type, classFQN, methodName });
};

const findResultCall = (id: string, event: TeamcityEvent) =>
    onTestRunnerEvents.get(TestRunnerEvent.result)?.mock.calls.find(
        // biome-ignore lint/suspicious/noExplicitAny: vitest mock calls have dynamic shape
        (call: any) => call[0].id === id && call[0].event === event,
    );

const adjustFailedDetails = (
    // biome-ignore lint/suspicious/noExplicitAny: test result with dynamic detail entries
    actual: any,
    details: { file: string; line: number }[],
    projectPath: (path: string) => string,
) => {
    if (hasFile(actual, 'AssertionsTest', 6)) {
        details = [{ file: projectPath('tests/AssertionsTest.php'), line: 6 }, ...details];
    }
    if (hasFile(actual, 'phpunit', 60)) {
        details = [...details, { file: projectPath('vendor/phpunit/phpunit/phpunit'), line: 60 }];
    }
    return details;
};

// biome-ignore lint/suspicious/noExplicitAny: test helper with dynamic property access
function expectedTestResult(expected: any, projectPath: (path: string) => string): void {
    const locationHint = `php_qn://${expected.file}::\\${expected.id}`;
    expected.id = resolveTestId(expected.id);

    const actual = findResultCall(expected.id, expected.event);
    expect(actual).not.toBeUndefined();

    if (expected.event === TeamcityEvent.testFailed && actual) {
        expected.details = adjustFailedDetails(actual, expected.details, projectPath);
        expect(actual[0].details).toEqual(expected.details);
    }

    const expectedWithHint = { ...expected, locationHint };
    if (actual) {
        expect(actual[0]).toEqual(expect.objectContaining(expectedWithHint));
    }
    expect(onTestResultEvents.get(expected.event)).toHaveBeenCalledWith(
        expect.objectContaining(expectedWithHint),
    );

    if (semverLt(PHPUNIT_VERSION, '10.0.0')) {
        expect(onTestResultEvents.get(TeamcityEvent.testVersion)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TeamcityEvent.testCount)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TeamcityEvent.testDuration)).toHaveBeenCalled();
        expect(onTestResultEvents.get(TeamcityEvent.testResultSummary)).toHaveBeenCalled();
    }

    expect(onTestRunnerEvents.get(TestRunnerEvent.run)).toHaveBeenCalled();
    expect(onTestRunnerEvents.get(TestRunnerEvent.close)).toHaveBeenCalled();
}

const teamcityOutput = (
    appPath: (path: string) => string,
    events: string[],
    summary = 'OK (1 test, 1 assertion)',
) => [
    'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
    'Runtime:       PHP 8.1.12',
    `Configuration: '${appPath('phpunit.xml')}`,
    "##teamcity[testCount count='1' flowId='8024']",
    ...events,
    'Time: 00:00.049, Memory: 6.00 MB',
    summary,
];

const generateTestResult = (
    testResult: {
        event: TeamcityEvent;
        name?: string;
        file: string;
        id: string;
        phpVfsComposer?: boolean;
    },
    appPath: (path: string) => string,
    phpVfsComposer: boolean = false,
) => {
    const { event, name, file, id } = testResult;
    const locationHint = `php_qn://${file}::\\${id}`;

    if ([TeamcityEvent.testSuiteStarted, TeamcityEvent.testSuiteFinished].includes(event)) {
        fakeSpawn(
            teamcityOutput(appPath, [
                `##teamcity[testSuiteStarted name='${id}' locationHint='${locationHint}' flowId='8024']`,
                `##teamcity[testSuiteFinished name='${id}' flowId='8024']`,
            ]),
        );
    }

    if ([TeamcityEvent.testStarted, TeamcityEvent.testFinished].includes(event)) {
        fakeSpawn(
            teamcityOutput(
                appPath,
                [
                    `##teamcity[testStarted name='${name}' locationHint='${locationHint}::${name}' flowId='8024']`,
                    `##teamcity[testFinished name='${name}' duration='0' flowId='8024']`,
                ],
                'Tests: 1, Assertions: 1, Failures: 1',
            ),
        );
    }

    if ([TeamcityEvent.testFailed].includes(event)) {
        let details = `${file}:26|n`;
        if (phpVfsComposer) {
            details += ` phpvfscomposer://${appPath('vendor/phpunit/phpunit/phpunit')}:60`;
        }
        fakeSpawn(
            teamcityOutput(
                appPath,
                [
                    `##teamcity[testStarted name='${name}' locationHint='${locationHint}::test_failed' flowId='8024']`,
                    `##teamcity[testFailed name='${name}' message='Failed asserting that false is true.|n|n${file}:6|n' details=' ${details} ' duration='0' flowId='8024']`,
                    `##teamcity[testFinished name='${name}' duration='0' flowId='8024']`,
                ],
                'Tests: 1, Assertions: 1, Failures: 1',
            ),
        );
    }
};

const expectedCommand = async (builder: ProcessBuilder, expected: string[]) => {
    const testRunner = new TestRunner();
    for (const [eventName, fn] of onTestResultEvents) {
        testRunner.on(eventName, (test: unknown) => fn(test));
    }
    for (const [eventName, fn] of onTestRunnerEvents) {
        testRunner.on(eventName, (test: unknown) => fn(test));
    }
    await testRunner.run(builder).run();

    const call = (spawn as Mock).mock.calls[0];
    expect([call[0], ...call[1]]).toEqual(expected);
};

const TEST_CLASS = 'Tests\\AssertionsTest';

describe('TestRunner Test', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('run error command', async () => {
        const cwd = phpUnitProject('');

        const configuration = new Configuration({
            php: 'foo',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', `${VAR_PWD}/phpunit.xml`],
        });

        const options = { cwd };
        const builder = new ProcessBuilder(
            configuration,
            options,
            new PathReplacer(options, configuration.get('paths') as Path),
        );
        const expected = [
            'foo',
            'vendor/bin/phpunit',
            `--configuration=${phpUnitProject('phpunit.xml')}`,
            '--colors=never',
            '--teamcity',
        ];
        await expectedCommand(builder, expected);

        const errorEvent = onTestRunnerEvents.get(TestRunnerEvent.error);
        const closeEvent = onTestRunnerEvents.get(TestRunnerEvent.close);
        if (errorEvent && closeEvent) {
            expect(errorEvent).toHaveBeenCalledTimes(1);
            expect(closeEvent).toHaveBeenCalledTimes(1);
        }
    });

    const testEnvironment = (
        name: string,
        projectPath: (path: string) => string,
        appPath: (path: string) => string,
        configuration: Configuration,
        buildCommand: (...middle: string[]) => string[],
        options?: { skipPhpVfsComposer?: boolean },
    ) => {
        const passedPattern = `^.*::(test_passed)( with data set .*)?$`;
        const failedPattern = `^.*::(test_passed|test_failed)( with data set .*)?$`;
        const filterPassed = `--filter=${passedPattern}`;
        const filterFailed = `--filter=${failedPattern}`;
        const testFile = appPath('tests/AssertionsTest.php');
        const localFile = projectPath('tests/AssertionsTest.php');

        const startEvent = (
            event: TeamcityEvent,
            opts?: { name?: string; phpVfsComposer?: boolean },
        ) => ({ event, file: testFile, id: TEST_CLASS, ...opts });

        // biome-ignore lint/suspicious/noExplicitAny: test helper with dynamic property access
        const finishedEvent = (event: TeamcityEvent, id: string, opts?: Record<string, any>) => ({
            event,
            flowId: expect.any(Number),
            id,
            file: localFile,
            ...opts,
        });

        describe(name, () => {
            const spawnOptions = { cwd: projectPath('') };
            const builder = new ProcessBuilder(
                configuration,
                spawnOptions,
                new PathReplacer(spawnOptions, configuration.get('paths') as Path),
            );

            const runTest = async (
                expected: string[],
                start: {
                    event: TeamcityEvent;
                    name?: string;
                    file: string;
                    id: string;
                    phpVfsComposer?: boolean;
                },
                // biome-ignore lint/suspicious/noExplicitAny: test helper with dynamic property access
                finished: any,
            ) => {
                generateTestResult(start, appPath, start.phpVfsComposer);
                await expectedCommand(builder, expected);
                expectedTestResult(finished, projectPath);
            };

            it('should run all tests', async () => {
                await runTest(
                    buildCommand(),
                    startEvent(TeamcityEvent.testStarted, { name: 'test_passed' }),
                    finishedEvent(TeamcityEvent.testFinished, `${TEST_CLASS}::test_passed`, {
                        name: 'test_passed',
                    }),
                );
            });

            it('should run test suite', async () => {
                builder.setArguments(localFile);
                await runTest(
                    buildCommand(testFile),
                    startEvent(TeamcityEvent.testSuiteStarted),
                    finishedEvent(TeamcityEvent.testSuiteFinished, TEST_CLASS),
                );
            });

            it('should run test passed', async () => {
                builder.setArguments(`${localFile} --filter "${passedPattern}"`);
                await runTest(
                    buildCommand(filterPassed, testFile),
                    startEvent(TeamcityEvent.testStarted, { name: 'test_passed' }),
                    finishedEvent(TeamcityEvent.testFinished, `${TEST_CLASS}::test_passed`),
                );
            });

            it('should run test failed', async () => {
                builder.setArguments(`${localFile} --filter "${failedPattern}"`);
                await runTest(
                    buildCommand(filterFailed, testFile),
                    startEvent(TeamcityEvent.testFailed, { name: 'test_failed' }),
                    finishedEvent(TeamcityEvent.testFailed, `${TEST_CLASS}::test_failed`, {
                        message: 'Failed asserting that false is true.',
                        details: [{ file: localFile, line: 26 }],
                    }),
                );
            });

            if (!options?.skipPhpVfsComposer) {
                it('should run test failed with phpvfscomposer', async () => {
                    builder.setArguments(`${localFile} --filter "${failedPattern}"`);
                    await runTest(
                        buildCommand(filterFailed, testFile),
                        startEvent(TeamcityEvent.testFailed, {
                            name: 'test_failed',
                            phpVfsComposer: true,
                        }),
                        finishedEvent(TeamcityEvent.testFailed, `${TEST_CLASS}::test_failed`, {
                            message: 'Failed asserting that false is true.',
                            details: [{ file: localFile, line: 26 }],
                        }),
                    );
                });
            }
        });
    };

    const remoteAppPath = (path: string) => (path ? `/app/${path}` : '/app');
    const winAppPath = (path: string) => (path ? `./${path}` : '.').replace(/\/g/, '\\');

    testEnvironment(
        'local',
        phpUnitProject,
        phpUnitProject,
        new Configuration({
            php: 'php',
            phpunit: `${VAR_WORKSPACE_FOLDER}/vendor/bin/phpunit`,
            args: ['-c', `${VAR_WORKSPACE_FOLDER}/phpunit.xml`],
        }),
        (...middle) => [
            'php',
            phpUnitProject('vendor/bin/phpunit'),
            `--configuration=${phpUnitProject('phpunit.xml')}`,
            ...middle,
            '--colors=never',
            '--teamcity',
        ],
        { skipPhpVfsComposer: true },
    );

    const sshPrefix = [
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
    ];
    testEnvironment(
        'SSH',
        phpUnitProject,
        remoteAppPath,
        new Configuration({
            command:
                'ssh -i dockerfiles/sshd/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no cd /app;',
            php: 'php',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', '/app/phpunit.xml'],
            paths: { [VAR_PWD]: remoteAppPath('') },
        }),
        (...middle) => [
            ...sshPrefix,
            [
                'php',
                'vendor/bin/phpunit',
                `--configuration=${remoteAppPath('phpunit.xml')}`,
                ...middle.map((a) => (a.startsWith('--filter') ? `'${a}'` : a)),
                '--colors=never',
                '--teamcity',
            ].join(' '),
        ],
    );

    const dockerPrefix = (projectPath: (p: string) => string) => [
        'docker',
        'run',
        '-i',
        '--rm',
        '-v',
        `${projectPath('')}:/app`,
        '-w',
        '/app',
        'phpunit-stub',
    ];

    for (const [name, projectPath, appPath] of [
        ['Docker', phpUnitProject, remoteAppPath],
        ['Windows Docker', phpUnitProjectWin, winAppPath],
    ] as const) {
        testEnvironment(
            name,
            projectPath,
            appPath,
            new Configuration({
                command: `docker run -i --rm -v ${VAR_WORKSPACE_FOLDER}:/app -w /app phpunit-stub`,
                php: 'php',
                phpunit: 'vendor/bin/phpunit',
                args: ['-c', `${VAR_PWD}/phpunit.xml`],
                paths: { [VAR_PWD]: appPath('') },
            }),
            (...middle) => [
                ...dockerPrefix(projectPath),
                'php',
                'vendor/bin/phpunit',
                `--configuration=${appPath('phpunit.xml')}`,
                ...middle,
                '--colors=never',
                '--teamcity',
            ],
        );
    }
});
