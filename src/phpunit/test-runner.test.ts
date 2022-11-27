import { beforeEach, describe, expect, it } from '@jest/globals';
import { projectPath } from './__tests__/helper';
import { TestRunner, TestRunnerEvent } from './test-runner';
import { Result, TestEvent } from './problem-matcher';
import { spawn } from 'child_process';
import { LocalCommand, DockerCommand, Command } from './command';

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

    const mockSpawn = (contents: string[], force = false) => {
        if (!process.env.GITHUB_ACTIONS && !force) {
            return;
        }

        const stdout = jest.fn().mockImplementation((_event, fn: Function) => {
            contents.forEach((line) => fn(line + '\n'));
        });
        const stderr = jest.fn();
        const onClose = jest.fn().mockImplementation((_event, fn: Function) => {
            if (_event === 'close') {
                fn(2);
            }
        });

        (spawn as jest.Mock).mockReturnValue({
            stdout: { on: stdout },
            stderr: { on: stderr },
            on: onClose,
        });
    };

    const mockTestPassed = (appPath: Function) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            `##teamcity[testStarted name='test_passed' locationHint='${locationHint}::test_passed' flowId='8024']`,
            `##teamcity[testFinished name='test_passed' duration='0' flowId='8024']`,
        ]);
    };

    const mockTestFailed = (appPath: Function, force = false) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn(
            [
                'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
                `##teamcity[testStarted name='test_failed' locationHint='${locationHint}::test_failed' flowId='8024']`,
                `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' ${file}:22|n ' duration='0' flowId='8024']`,
                `##teamcity[testFinished name='test_failed' duration='0' flowId='8024']`,
            ],
            force
        );
    };

    const mockTestSuite = (appPath: Function) => {
        const file = appPath('tests/AssertionsTest.php');
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const locationHint = `php_qn://${file}::\\${id}`;

        mockSpawn([
            'PHPUnit 9.5.26 by Sebastian Bergmann and contributors.',
            `##teamcity[testSuiteStarted name='${id}' locationHint='${locationHint}' flowId='8024']`,
            `##teamcity[testSuiteFinished name='${id}' flowId='8024']`,
        ]);
    };

    const runTest = async (command: Command) => {
        const testRunner = new TestRunner({ cwd });
        testRunner.on(TestRunnerEvent.result, (test: Result) => onTest(test));
        testRunner.on(TestRunnerEvent.close, onClose);

        await testRunner.run(command);
    };

    const expectedRun = async (command: Command, expected: any[]) => {
        await runTest(command);

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

    describe('PHPUnit', () => {
        const command = new LocalCommand();
        const appPath = projectPath;
        it('should run all tests', async () => {
            const args = '-c phpunit.xml';

            await expectedRun(command.setArguments(args), [
                'php',
                'vendor/bin/phpunit',
                '--configuration=phpunit.xml',
                '--teamcity',
                '--colors=never',
            ]);

            expectedTest({
                event: TestEvent.testFinished,
                name: 'test_passed',
                flowId: expect.any(Number),
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                file: projectPath('tests/AssertionsTest.php'),
            });
        });

        it('should run test suite', async () => {
            const args = `${projectPath('tests/AssertionsTest.php')} -c phpunit.xml`;

            await expectedRun(command.setArguments(args), [
                'php',
                'vendor/bin/phpunit',
                appPath('tests/AssertionsTest.php'),
                '--configuration=phpunit.xml',
                '--teamcity',
                '--colors=never',
            ]);

            expectedTest({
                event: TestEvent.testSuiteFinished,
                name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                flowId: expect.any(Number),
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                file: projectPath('tests/AssertionsTest.php'),
            });
        });

        it('should run test passed', async () => {
            const name = 'test_passed';
            const filter = `^.*::(${name})( with data set .*)?$`;
            const file = projectPath('tests/AssertionsTest.php');
            const args = `${file} --filter "${filter}" -c phpunit.xml`;

            await expectedRun(command.setArguments(args), [
                'php',
                'vendor/bin/phpunit',
                appPath('tests/AssertionsTest.php'),
                expect.stringMatching(dataProviderPattern(name)),
                '--configuration=phpunit.xml',
                '--teamcity',
                '--colors=never',
            ]);

            expectedTest({
                event: TestEvent.testFinished,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: projectPath('tests/AssertionsTest.php'),
            });
        });

        it('should run test failed', async () => {
            const name = 'test_failed';
            const filter = `^.*::(test_passed|test_failed)( with data set .*)?$`;
            const file = projectPath('tests/AssertionsTest.php');
            const args = `${file} --filter "${filter}" -c phpunit.xml`;

            await expectedRun(command.setArguments(args), [
                'php',
                'vendor/bin/phpunit',
                appPath('tests/AssertionsTest.php'),
                expect.stringMatching(dataProviderPattern('test_passed|test_failed')),
                '--configuration=phpunit.xml',
                '--teamcity',
                '--colors=never',
            ]);

            expectedTest({
                event: TestEvent.testFailed,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: projectPath('tests/AssertionsTest.php'),
                message: 'Failed asserting that false is true.',
                details: [{ file: projectPath('tests/AssertionsTest.php'), line: 22 }],
                duration: expect.any(Number),
            });
        });
    });

    describe('docker', () => {
        const appPath = (path: string) => `/app/${path}`;
        const command = new DockerCommand(new Map<string, string>([[projectPath(''), '/app']]));

        it('should run all tests', async () => {
            const args = '-c phpunit.xml';

            mockTestPassed(appPath);

            await expectedRun(command.setArguments(args), [
                'docker',
                'exec',
                'CONTAINER',
                'php',
                'vendor/bin/phpunit',
                '--configuration=phpunit.xml',
                '--teamcity',
                '--colors=never',
            ]);

            expectedTest({
                event: TestEvent.testFinished,
                name: 'test_passed',
                flowId: expect.any(Number),
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                file: projectPath('tests/AssertionsTest.php'),
            });
        });

        it('should run test suite', async () => {
            const args = `${projectPath('tests/AssertionsTest.php')} -c phpunit.xml`;

            mockTestSuite(appPath);

            await expectedRun(command.setArguments(args), [
                'docker',
                'exec',
                'CONTAINER',
                'php',
                'vendor/bin/phpunit',
                appPath('tests/AssertionsTest.php'),
                '--configuration=phpunit.xml',
                '--teamcity',
                '--colors=never',
            ]);

            expectedTest({
                event: TestEvent.testSuiteFinished,
                name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                flowId: expect.any(Number),
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                file: projectPath('tests/AssertionsTest.php'),
            });
        });

        it('should run test case', async () => {
            const name = 'test_passed';
            const filter = `^.*::(${name})( with data set .*)?$`;
            const file = projectPath('tests/AssertionsTest.php');
            const args = `${file} --filter "${filter}" -c phpunit.xml`;

            mockTestPassed(appPath);

            await expectedRun(command.setArguments(args), [
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
            ]);

            expectedTest({
                event: TestEvent.testFinished,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: projectPath('tests/AssertionsTest.php'),
            });
        });
    });

    describe('docker for windows', () => {
        const appPath = (path: string) => `/app/${path}`;
        const projectPath = (path: string) => {
            return `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
        };
        const command = new DockerCommand(new Map<string, string>([[projectPath(''), '/app']]));

        it('should mapping path', async () => {
            const name = 'test_passed';
            const filter = `^.*::(${name})( with data set .*)?$`;
            const file = projectPath('tests/AssertionsTest.php');
            const args = `${file} --filter "${filter}" -c phpunit.xml`;

            mockTestPassed(appPath);

            await expectedRun(command.setArguments(args), [
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
            ]);

            expectedTest({
                event: TestEvent.testFinished,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: projectPath('tests/AssertionsTest.php'),
            });
        });

        it('should mapping details path', async () => {
            const name = 'test_failed';
            const filter = `^.*::(test_passed|test_failed)( with data set .*)?$`;
            const file = projectPath('tests/AssertionsTest.php');
            const args = `${file} --filter "${filter}" -c phpunit.xml`;

            mockTestFailed(appPath);

            await expectedRun(command.setArguments(args), [
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
            ]);

            expectedTest({
                event: TestEvent.testFailed,
                name,
                flowId: expect.any(Number),
                id: `Recca0120\\VSCode\\Tests\\AssertionsTest::${name}`,
                file: projectPath('tests/AssertionsTest.php'),
                message: 'Failed asserting that false is true.',
                details: [{ file: projectPath('tests/AssertionsTest.php'), line: 22 }],
                duration: expect.any(Number),
            });
        });
    });
});
