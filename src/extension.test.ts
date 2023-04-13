import { describe, expect, it } from '@jest/globals';
import { activate } from './extension';
import * as vscode from 'vscode';
import { TestController, TextDocument, Uri, WorkspaceFolder } from 'vscode';
import { glob, GlobOptions } from 'glob';
import { readFileSync } from 'fs';
import { getPhpUnitVersion, normalPath, projectPath } from './phpunit/__tests__/helper';
import * as path from 'path';
import { spawn } from 'child_process';

jest.mock('child_process');

const setTextDocuments = (textDocuments: TextDocument[]) => {
    Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: textDocuments,
    });
};

const setWorkspaceFolders = (workspaceFolders: WorkspaceFolder[]) => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: workspaceFolders,
    });
};

const globTextDocuments = (pattern: string, options?: GlobOptions) => {
    options = {
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/vendor/**'],
        ...options,
    };

    return glob
        .sync(pattern, options)
        .map((file) => Uri.file(file as string))
        .map((uri) => ({
            uri,
            fileName: uri.fsPath,
            getText: () => readFileSync(uri.fsPath).toString(),
        })) as TextDocument[];
};

const _setTimeout = global.setTimeout;

const useFakeTimers = (ms: number, fn: Function) => {
    (global as any).setTimeout = (fn: any, _ms?: number) => fn();

    return new Promise((resolve) => {
        fn();
        _setTimeout(() => resolve(true), ms);
    });
};

const getOutputChannel = () => {
    return (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;
};

const getTestController = () => {
    return (vscode.tests.createTestController as jest.Mock).mock.results[0].value;
};

const getRunProfile = (ctrl: TestController) => {
    return (ctrl.createRunProfile as jest.Mock).mock.results[0].value;
};

const getTestFile = (ctrl: TestController, pattern: RegExp) => {
    const doc = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath.match(pattern))!;

    return ctrl.items.get(doc.uri.toString());
};

const getTestRun = (ctrl: TestController) => {
    return (ctrl.createTestRun as jest.Mock).mock.results[0].value;
};

const expectTestResultCalled = (ctrl: TestController, expected: any) => {
    const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

    expect(enqueued).toHaveBeenCalledTimes(expected.enqueued);
    expect(started).toHaveBeenCalledTimes(expected.started);
    expect(passed).toHaveBeenCalledTimes(expected.passed);
    expect(failed).toHaveBeenCalledTimes(expected.failed);
    expect(end).toHaveBeenCalledTimes(expected.end);

    expect(getOutputChannel().appendLine).toHaveBeenCalled();
};

describe('Extension Test', () => {
    const root = projectPath('');
    const phpUnitVersion: number = getPhpUnitVersion();

    beforeEach(() => {
        setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: Uri.file(root) }]);
        setTextDocuments(globTextDocuments('**/*Test.php', { cwd: root }));
        jest.clearAllMocks();
    });

    describe('activate()', () => {
        const context: any = { subscriptions: { push: jest.fn() } };
        let cwd: string;

        beforeEach(async () => {
            context.subscriptions.push.mockReset();
            cwd = normalPath(projectPath(''));
            const configuration = vscode.workspace.getConfiguration('phpunit');
            await configuration.update('php', 'php');
            await configuration.update('phpunit', 'vendor/bin/phpunit');
        });

        it('should load tests', async () => {
            await activate(context);

            const file = Uri.file(path.join(root, 'tests/AssertionsTest.php'));
            const testId = `Recca0120\\VSCode\\Tests\\AssertionsTest`;

            const parent = getTestController().items.get(testId);
            const child = parent.children.get(`${testId}::test_passed`);

            expect(parent).toEqual(
                expect.objectContaining({
                    id: testId,
                    uri: expect.objectContaining({ path: file.path }),
                })
            );

            expect(child).toEqual(
                expect.objectContaining({
                    id: `${testId}::test_passed`,
                    uri: expect.objectContaining({ path: file.path }),
                    range: {
                        start: { line: 11, character: 4 },
                        end: { line: 14, character: 5 },
                        // end: {line: 11, character: 29},
                    },
                })
            );

            expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('PHPUnit');
            expect(vscode.tests.createTestController).toBeCalledWith(
                'phpUnitTestController',
                'PHPUnit'
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.reload',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.run-all',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.run-file',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.run-test-at-cursor',
                expect.any(Function)
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.rerun',
                expect.any(Function)
            );
            expect(context.subscriptions.push).toHaveBeenCalledTimes(9);
        });

        it('should run all tests', async () => {
            await activate(context);

            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);

            const request = { include: undefined, exclude: [], profile: runProfile };

            await runProfile.runHandler(request, new vscode.CancellationTokenSource().token);

            expect(spawn).toBeCalledWith(
                'php',
                ['vendor/bin/phpunit', '--teamcity', '--colors=never'],
                { cwd }
            );

            let expected;
            if (phpUnitVersion > 9) {
                expected = { enqueued: 50, started: 30, passed: 18, failed: 10, end: 1 };
            } else {
                expected = { enqueued: 50, started: 24, passed: 11, failed: 11, end: 1 };
            }
            expectTestResultCalled(ctrl, expected);
        });

        it('should run test suite', async () => {
            await activate(context);

            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);

            const testId = `Recca0120\\VSCode\\Tests\\AssertionsTest`;
            const request = { include: [ctrl.items.get(testId)], exclude: [], profile: runProfile };

            await runProfile.runHandler(request, new vscode.CancellationTokenSource().token);

            expect(spawn).toBeCalledWith(
                'php',
                [
                    'vendor/bin/phpunit',
                    normalPath(projectPath('tests/AssertionsTest.php')),
                    '--teamcity',
                    '--colors=never',
                ],
                { cwd }
            );

            expectTestResultCalled(ctrl, {
                enqueued: 8,
                started: 11,
                passed: 5,
                failed: 4,
                end: 1,
            });
        });

        it('should run test case', async () => {
            const method = 'test_throw_exception';
            const testId = `Recca0120\\VSCode\\Tests\\CalculatorTest::${method}`;

            const pattern = new RegExp(
                `--filter=["']?\\^\\.\\*::\\(${method}\\)\\(\\swith\\sdata\\sset\\s\\.\\*\\)\\?\\$["']?`
            );

            await activate(context);
            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);
            const request = { include: [ctrl.items.get(testId)], exclude: [], profile: runProfile };

            await runProfile.runHandler(request, new vscode.CancellationTokenSource().token);

            expect(spawn).toBeCalledWith(
                'php',
                [
                    'vendor/bin/phpunit',
                    normalPath(projectPath('tests/CalculatorTest.php')),
                    expect.stringMatching(pattern),
                    '--teamcity',
                    '--colors=never',
                ],
                { cwd }
            );

            expectTestResultCalled(ctrl, {
                enqueued: 1,
                started: 1,
                passed: 0,
                failed: 1,
                end: 1,
            });

            const { failed } = getTestRun(ctrl);
            const [, message] = (failed as jest.Mock).mock.calls.find(
                ([test]) => test.id === testId
            );

            expect(message.location).toEqual(
                expect.objectContaining({
                    range: {
                        start: { line: 53, character: 0 },
                        end: { line: 53, character: 0 },
                    },
                })
            );
        });

        it('should refresh test', async () => {
            await activate(context);

            const ctrl = getTestController();

            await ctrl.refreshHandler();
        });

        it('should resolve test', async () => {
            await activate(context);

            const ctrl = getTestController();

            await ctrl.resolveHandler();
        });
    });
});
