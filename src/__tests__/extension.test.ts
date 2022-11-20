import { describe, expect, it } from '@jest/globals';
import { activate } from '../extension';
import * as vscode from 'vscode';
import { TestController, TextDocument, WorkspaceFolder } from 'vscode';
import { glob, IOptions } from 'glob';
import { readFileSync } from 'fs';
import { URI } from 'vscode-uri';
import { projectPath } from '../phpunit/__tests__/helper';
import * as path from 'path';

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
    options = { absolute: true, ignore: ['**/node_modules/**', '**/.git/**'], ...options };

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
    beforeEach(() => jest.clearAllMocks());

    describe('activate()', () => {
        // const root = path.join(__dirname, '../../sample');
        const root = projectPath('');
        const context: any = { subscriptions: { push: jest.fn() } };

        beforeEach(() => {
            setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: URI.file(root) }]);
            setTextDocuments(globTextDocuments('**/*.php', { cwd: root }));
            context.subscriptions.push.mockReset();
        });

        it('should load tests', async () => {
            await activate(context);

            const file = URI.file(path.join(root, 'tests/AssertionsTest.php'));
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';

            const parent = getTestController().items.get(id);
            const child = parent.children.get(`${id}::test_passed`);

            expect(parent).toEqual(
                expect.objectContaining({
                    id,
                    uri: expect.objectContaining({
                        path: file.path,
                    }),
                })
            );

            expect(child).toEqual(
                expect.objectContaining({
                    id: `${id}::test_passed`,
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

        xit('should run test', async () => {
            await activate(context);

            const ctrl = getTestController();
            const runProfile = getRunProfile(ctrl);

            const request = {
                include: [getTestFile(ctrl, /test\.md$/)],
                exclude: [],
                profile: runProfile,
            };

            await useFakeTimers(500, () => {
                runProfile.runHandler(request, new vscode.CancellationTokenSource().token);
            });

            const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

            expect(enqueued).toHaveBeenCalledTimes(4);
            expect(started).toHaveBeenCalledTimes(4);
            expect(passed).toHaveBeenCalledTimes(3);
            expect(failed).toHaveBeenCalledTimes(1);
            expect(end).toHaveBeenCalledTimes(1);
        });

        xit('should refresh test', async () => {
            await activate(context);
            const ctrl = getTestController();

            await ctrl.refreshHandler();
        });

        xit('should resolve test', async () => {
            await activate(context);
            const ctrl = getTestController();

            await ctrl.resolveHandler();
        });
    });
});
