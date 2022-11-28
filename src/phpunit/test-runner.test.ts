import { beforeEach, describe, expect, it } from '@jest/globals';
import { projectPath } from './__tests__/helper';
import { TestRunner, TestRunnerEvent } from './test-runner';
import { Result, TestEvent } from './problem-matcher';
import { spawn } from 'child_process';
import { Command, DockerCommand, LocalCommand } from './command';

jest.mock('child_process');

describe('TestRunner Test', () => {
    const cwd = projectPath('');
    const onTest = jest.fn();
    const onClose = jest.fn();
    const dataProviderPattern = (name: string) => {
        return new RegExp(
            `--filter=["']?\\^\\.\\*::\\(${name}\\)\\(\\swith\\sdata\\sset\\s\\.\\*\\)\\?\\$["']?`
        );
    };

    const mockSpawn = (contents: string[]) => {
        const stdout = jest.fn().mockImplementation((_event, fn: (data: string) => void) => {
            contents.forEach((line) => fn(line + '\n'));
        });

        const onClose = jest.fn().mockImplementation((_event, fn: (data: number) => void) => {
            if (_event === 'close') {
                fn(2);
            }
        });

        (spawn as jest.Mock).mockReturnValue({
            stdout: { on: stdout },
            stderr: { on: jest.fn() },
            on: onClose,
        });
    };

    const mockTestPassed = (appPath: (path: string) => string) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            `##teamcity[testStarted name='test_passed' locationHint='${locationHint}::test_passed' flowId='8024']`,
            `##teamcity[testFinished name='test_passed' duration='0' flowId='8024']`,
        ]);
    };

    const mockTestFailed = (appPath: (path: string) => string) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            `##teamcity[testStarted name='test_failed' locationHint='${locationHint}::test_failed' flowId='8024']`,
            `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' ${file}:22|n ' duration='0' flowId='8024']`,
            `##teamcity[testFinished name='test_failed' duration='0' flowId='8024']`,
        ]);
    };

    const mockTestFailedWithPhpVfsComposer = (appPath: (path: string) => string) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;
        const phpVfsComposer = `phpvfscomposer://${appPath('vendor/phpunit/phpunit/phpunit')}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            `##teamcity[testStarted name='test_failed' locationHint='${locationHint}::test_failed' flowId='8024']`,
            `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' ${file}:22|n ${phpVfsComposer}:60 ' duration='0' flowId='8024']`,
            `##teamcity[testFinished name='test_failed' duration='0' flowId='8024']`,
        ]);
    };

    const mockTestSuite = (appPath: (path: string) => string) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            `##teamcity[testSuiteStarted name='${id}' locationHint='${locationHint}' flowId='8024']`,
            `##teamcity[testSuiteFinished name='${id}' flowId='8024']`,
        ]);
    };

    const expectedRun = async (command: Command, expected: any[]) => {
        const testRunner = new TestRunner({ cwd });
        testRunner.on(TestRunnerEvent.result, (test: Result) => onTest(test));
        testRunner.on(TestRunnerEvent.close, onClose);
        await testRunner.run(command);

        const [cmd, ...args] = expected;

        expect(spawn).toBeCalledWith(cmd, args, { cwd });
    };

    const expectedTest = (expected: any) => {
        const locationHint = `php_qn://${expected.file}::\\${expected.id}`;

        expect(onTest).toHaveBeenCalledWith(expect.objectContaining({ ...expected, locationHint }));
        expect(onClose).toHaveBeenCalled();
    };

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    async function shouldRunAllTests(
        expected: any[],
        command: Command,
        projectPath: (path: string) => string
    ) {
        const args = '-c phpunit.xml';

        await expectedRun(command.setArguments(args), expected);

        expectedTest({
            event: TestEvent.testFinished,
            name: 'test_passed',
            flowId: expect.any(Number),
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
            file: projectPath('tests/AssertionsTest.php'),
        });
    }

    async function shouldRunTestSuite(
        expected: any[],
        command: Command,
        projectPath: (path: string) => string
    ) {
        const args = `${projectPath('tests/AssertionsTest.php')} -c phpunit.xml`;

        await expectedRun(command.setArguments(args), expected);

        expectedTest({
            event: TestEvent.testSuiteFinished,
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            flowId: expect.any(Number),
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            file: projectPath('tests/AssertionsTest.php'),
        });
    }

    async function shouldRunTestPassed(
        expected: any[],
        command: Command,
        name: string,
        projectPath: (path: string) => string
    ) {
        const filter = `^.*::(${name})( with data set .*)?$`;
        const file = projectPath('tests/AssertionsTest.php');
        const args = `${file} --filter "${filter}" -c phpunit.xml`;

        await expectedRun(command.setArguments(args), expected);

        expectedTest({
            event: TestEvent.testFinished,
            name,
            flowId: expect.any(Number),
            id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
            file: projectPath('tests/AssertionsTest.php'),
        });
    }

    async function shouldRunTestFailed(
        expected: any[],
        command: LocalCommand,
        projectPath: (uri: string) => string,
        phpVfsComposer = false
    ) {
        const name = 'test_failed';
        const filter = `^.*::(test_passed|test_failed)( with data set .*)?$`;
        const file = projectPath('tests/AssertionsTest.php');
        const args = `${file} --filter "${filter}" -c phpunit.xml`;

        await expectedRun(command.setArguments(args), expected);

        const details = [{ file: projectPath('tests/AssertionsTest.php'), line: 22 }];
        if (phpVfsComposer) {
            details.push({ file: projectPath('vendor/phpunit/phpunit/phpunit'), line: 60 });
        }

        expectedTest({
            event: TestEvent.testFailed,
            name,
            flowId: expect.any(Number),
            id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
            file: projectPath('tests/AssertionsTest.php'),
            message: 'Failed asserting that false is true.',
            details,
            duration: expect.any(Number),
        });
    }

    async function shouldRunTestFailedWithPhpVfsComposer(
        expected: any[],
        command: LocalCommand,
        projectPath: (uri: string) => string
    ) {
        await shouldRunTestFailed(expected, command, projectPath, true);
    }

    describe('PHPUnit', () => {
        const command = new LocalCommand();
        const appPath = projectPath;

        it('should run all tests', async () => {
            await shouldRunAllTests(
                [
                    'php',
                    'vendor/bin/phpunit',
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test suite', async () => {
            await shouldRunTestSuite(
                [
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test passed', async () => {
            const name = 'test_passed';

            await shouldRunTestPassed(
                [
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern(name)),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                name,
                projectPath
            );
        });

        it('should run test failed', async () => {
            await shouldRunTestFailed(
                [
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test failed with phpvfscomposer', async () => {
            mockTestFailedWithPhpVfsComposer(appPath);

            await shouldRunTestFailedWithPhpVfsComposer(
                [
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });
    });

    describe('docker', () => {
        const appPath = (path: string) => `/app/${path}`;
        const command = new DockerCommand(new Map<string, string>([[projectPath(''), '/app']]));

        it('should run all tests', async () => {
            mockTestPassed(appPath);

            await shouldRunAllTests(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test suite', async () => {
            mockTestSuite(appPath);

            await shouldRunTestSuite(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test passed', async () => {
            const name = 'test_passed';
            mockTestPassed(appPath);

            await shouldRunTestPassed(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern(name)),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                name,
                projectPath
            );
        });

        it('should run test failed', async () => {
            mockTestFailed(appPath);

            await shouldRunTestFailed(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test failed with phpvfscomposer', async () => {
            mockTestFailedWithPhpVfsComposer(appPath);

            await shouldRunTestFailedWithPhpVfsComposer(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });
    });

    describe('docker for windows', () => {
        const appPath = (path: string) => `/app/${path}`;
        const projectPath = (path: string) => {
            return `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
        };
        const command = new DockerCommand(new Map<string, string>([[projectPath(''), '/app']]));

        it('should run test passed', async () => {
            const name = 'test_passed';
            mockTestPassed(appPath);

            await shouldRunTestPassed(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern(name)),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                name,
                projectPath
            );
        });

        it('should run test failed', async () => {
            mockTestFailed(appPath);

            await shouldRunTestFailed(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });

        it('should run test failed with phpvfscomposer', async () => {
            mockTestFailedWithPhpVfsComposer(appPath);

            await shouldRunTestFailedWithPhpVfsComposer(
                [
                    'docker',
                    'exec',
                    'CONTAINER',
                    'php',
                    'vendor/bin/phpunit',
                    appPath('tests/AssertionsTest.php'),
                    expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                    '--configuration=phpunit.xml',
                    '--teamcity',
                    '--colors=never',
                ],
                command,
                projectPath
            );
        });
    });
});
