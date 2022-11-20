import { describe, expect, it } from '@jest/globals';
import { activate } from '../extension';
import * as vscode from 'vscode';
import { TestController, TextDocument, WorkspaceFolder } from 'vscode';
import { glob, IOptions } from 'glob';
import { readFileSync } from 'fs';
import { URI } from 'vscode-uri';
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
        const root = path.join(__dirname, '../../sample');
        const context: any = { subscriptions: { push: jest.fn() } };

        beforeEach(() => {
            setWorkspaceFolders([{ index: 0, name: 'sample', uri: URI.file(root) }]);
            setTextDocuments(globTextDocuments('**/*.md', { cwd: root }));
            context.subscriptions.push.mockReset();
        });

        it('should load tests', async () => {
            await activate(context);
            const testController = getTestController();

            const createTestItem = testController.createTestItem;
            const file = URI.file(path.join(root, 'test.md'));

            expect(createTestItem).toBeCalledWith(file.toString(), 'test.md', expect.any(URI));
            expect(context.subscriptions.push).toHaveBeenCalledTimes(2);
        });

        it('should run test', async () => {
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
