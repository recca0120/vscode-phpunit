import { beforeEach, describe, expect, it } from '@jest/globals';
import { projectPath } from './__tests__/helper';
import { Command, DockerCommand, TestRunner, TestRunnerEvent } from './test-runner';
import { Result, TestEvent } from './problem-matcher';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('TestRunner Test', () => {
    const cwd = projectPath('');
    const onTest = jest.fn();
    const onClose = jest.fn();
    const dataProviderPattern = (name: string) =>
        new RegExp(
            `--filter=["']?\\^\\.\\*::\\(${name}\\)\\(\\swith\\sdata\\sset\\s\\.\\*\\)\\?\\$["']?`
        );

    const runTest = async (command: Command) => {
        const testRunner = new TestRunner({ cwd });
        testRunner.on(TestRunnerEvent.result, (test: Result) => onTest(test));
        testRunner.on(TestRunnerEvent.close, onClose);

        await testRunner.run(command);
    };

    const expectedRun = (expected: any[]) => {
        const [command, ...args] = expected;

        expect(spawn).toBeCalledWith(command, args, { cwd });
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
        const command = new Command();
        const appPath = projectPath;
        it('should run all tests', async () => {
            command.setArguments('-c phpunit.xml');

            await runTest(command);

            expectedRun([
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
            command.setArguments(`${projectPath('tests/AssertionsTest.php')} -c phpunit.xml`);

            await runTest(command);

            expectedRun([
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
            const filter = '^.*::(test_passed)( with data set .*)?$';

            command.setArguments(
                `${projectPath('tests/AssertionsTest.php')} --filter "${filter}" -c phpunit.xml`
            );

            await runTest(command);

            await expectedRun([
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

    describe('docker', () => {
        const appPath = (path: string) => `/app/${path}`;
        const command = new DockerCommand(new Map<string, string>([[projectPath(''), '/app']]));

        it('should run all tests', async () => {
            command.setArguments('-c phpunit.xml');

            await runTest(command);

            expectedRun([
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
            command.setArguments(`${projectPath('tests/AssertionsTest.php')} -c phpunit.xml`);

            await runTest(command);

            expectedRun([
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
            const filter = '^.*::(test_passed)( with data set .*)?$';

            command.setArguments(
                `${projectPath('tests/AssertionsTest.php')} --filter "${filter}" -c phpunit.xml`
            );

            await runTest(command);

            await expectedRun([
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
});
