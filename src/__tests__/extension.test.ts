import { describe, expect, it } from '@jest/globals';
import { activate } from '../extension';
import * as vscode from 'vscode';
import { TestController, TextDocument, WorkspaceFolder } from 'vscode';
import { glob, IOptions } from 'glob';
import { readFileSync } from 'fs';
import { URI } from 'vscode-uri';
import { normalPath, projectPath } from '../phpunit/__tests__/helper';
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

const globTextDocuments = (pattern: string, options?: IOptions) => {
    options = {
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/vendor/**'],
        ...options,
    };

    return glob
        .sync(pattern, options)
        .map((file) => URI.file(file))
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

describe('Extension Test', () => {
    const root = projectPath('');

    beforeEach(() => {
        setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: URI.file(root) }]);
        setTextDocuments(globTextDocuments('**/*Test.php', { cwd: root }));
        jest.clearAllMocks();
    });

    describe('activate()', () => {
        const context: any = { subscriptions: { push: jest.fn() } };
        let cwd: string;
        beforeEach(() => {
            context.subscriptions.push.mockReset();
            cwd = normalPath(projectPath(''));
        });

        it('should load tests', async () => {
            const file = URI.file(path.join(root, 'tests/AssertionsTest.php'));
            const testId = `Recca0120\\VSCode\\Tests\\AssertionsTest`;

            await activate(context);
            const parent = getTestController().items.get(testId);
            const child = parent.children.get(`${testId}::test_passed`);

            expect(parent).toEqual(
                expect.objectContaining({
                    id: testId,
                    uri: expect.objectContaining({
                        path: file.path,
                    }),
                })
            );

            expect(child).toEqual(
                expect.objectContaining({
                    id: `${testId}::test_passed`,
                    uri: expect.objectContaining({
                        path: file.path,
                    }),
                    range: {
                        start: { line: 11, character: 4 },
                        end: { line: 11, character: 29 },
                    },
                })
            );

            expect(context.subscriptions.push).toHaveBeenCalledTimes(2);
        });

        it('should run all tests', async () => {
            await activate(context);
            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);
            const request = { include: undefined, exclude: [], profile: runProfile };
            runProfile.runHandler(request, new vscode.CancellationTokenSource().token);
            await new Promise((resolve) => setTimeout(() => resolve(true), 500));

            const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

            expect(enqueued).toHaveBeenCalledTimes(34);
            expect(started).toHaveBeenCalledTimes(20);
            expect(passed).toHaveBeenCalledTimes(10);
            expect(failed).toHaveBeenCalledTimes(8);
            expect(end).toHaveBeenCalledTimes(1);

            expect(spawn).toBeCalledWith(
                'php',
                ['vendor/bin/phpunit', '--teamcity', '--colors=never'],
                { cwd }
            );
        });

        it('should run test suite', async () => {
            // const file = URI.file(path.join(root, 'tests/AssertionsTest.php'));
            const testId = `Recca0120\\VSCode\\Tests\\AssertionsTest`;

            await activate(context);
            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);
            const request = { include: [ctrl.items.get(testId)], exclude: [], profile: runProfile };
            runProfile.runHandler(request, new vscode.CancellationTokenSource().token);
            await new Promise((resolve) => setTimeout(() => resolve(true), 500));

            const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

            expect(enqueued).toHaveBeenCalledTimes(8);
            expect(started).toHaveBeenCalledTimes(11);
            expect(passed).toHaveBeenCalledTimes(5);
            expect(failed).toHaveBeenCalledTimes(4);
            expect(end).toHaveBeenCalledTimes(1);

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
        });

        it('should run test case', async () => {
            // const file = URI.file(path.join(root, 'tests/AssertionsTest.php'));
            const method = 'test_passed';
            const testId = `Recca0120\\VSCode\\Tests\\AssertionsTest::${method}`;

            await activate(context);
            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);
            const request = { include: [ctrl.items.get(testId)], exclude: [], profile: runProfile };

            runProfile.runHandler(request, new vscode.CancellationTokenSource().token);
            await new Promise((resolve) => setTimeout(() => resolve(true), 500));

            const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

            expect(enqueued).toHaveBeenCalledTimes(1);
            expect(started).toHaveBeenCalledTimes(1);
            expect(passed).toHaveBeenCalledTimes(1);
            expect(failed).toHaveBeenCalledTimes(0);
            expect(end).toHaveBeenCalledTimes(1);

            const pattern = new RegExp(
                `--filter=["']?\\^\\.\\*::\\(${method}\\)\\(\\swith\\sdata\\sset\\s\\.\\*\\)\\?\\$["']?`
            );
            expect(spawn).toBeCalledWith(
                'php',
                [
                    'vendor/bin/phpunit',
                    normalPath(projectPath('tests/AssertionsTest.php')),
                    expect.stringMatching(pattern),
                    '--teamcity',
                    '--colors=never',
                ],
                { cwd }
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
