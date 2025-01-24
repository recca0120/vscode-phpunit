import { glob, GlobOptions } from 'glob';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as semver from 'semver';
import {
    CancellationTokenSource, commands, TestController, TestItem, TestItemCollection, tests, TextDocument, Uri, window,
    workspace, WorkspaceFolder,
} from 'vscode';
import { Configuration } from './Configuration';
import { activate } from './extension';
import { getPhpUnitVersion, getPhpVersion, normalPath, pestProject, phpUnitProject } from './PHPUnit/__tests__/utils';

jest.mock('child_process');

const setTextDocuments = (textDocuments: TextDocument[]) => {
    Object.defineProperty(workspace, 'textDocuments', {
        value: textDocuments,
    });
};

const setWorkspaceFolders = (workspaceFolders: WorkspaceFolder[]) => {
    Object.defineProperty(workspace, 'workspaceFolders', {
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

// const _setTimeout = global.setTimeout;
//
// const useFakeTimers = (ms: number, fn: Function) => {
//     (global as any).setTimeout = (fn: any, _ms?: number) => fn();
//
//     return new Promise((resolve) => {
//         fn();
//         _setTimeout(() => resolve(true), ms);
//     });
// };

const getOutputChannel = () => {
    return (window.createOutputChannel as jest.Mock).mock.results[0].value;
};

const getTestController = () => {
    return (tests.createTestController as jest.Mock).mock.results[0].value;
};

const getRunProfile = (ctrl: TestController) => {
    return (ctrl.createRunProfile as jest.Mock).mock.results[0].value;
};

const findTest = (items: TestItemCollection, id: string): TestItem | undefined => {
    for (const [_id, item] of items) {
        if (item.id === id) {
            return item;
        }
        const child = findTest(item.children, id);
        if (child) {
            return child;
        }
    }

    return;
};

// const getTestFile = (ctrl: TestController, pattern: RegExp) => {
//     const doc = workspace.textDocuments.find((doc) => doc.uri.fsPath.match(pattern))!;
//
//     return findTest(ctrl.items, doc.uri.toString());
// };

const getTestRun = (ctrl: TestController) => {
    return (ctrl.createTestRun as jest.Mock).mock.results[0].value;
};

const expectTestResultCalled = (ctrl: TestController, expected: any) => {
    const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

    expect({
        enqueued: enqueued.mock.calls.length,
        started: started.mock.calls.length,
        passed: passed.mock.calls.length,
        failed: failed.mock.calls.length,
        end: end.mock.calls.length,
    }).toEqual(expected);
    // expect(enqueued).toHaveBeenCalledTimes(expected.enqueued);
    // expect(started).toHaveBeenCalledTimes(expected.started);
    // expect(passed).toHaveBeenCalledTimes(expected.passed);
    // expect(failed).toHaveBeenCalledTimes(expected.failed);
    // expect(end).toHaveBeenCalledTimes(expected.end);

    expect(getOutputChannel().appendLine).toHaveBeenCalled();
};

const countItems = (testItemCollection: TestItemCollection) => {
    let sum = 0;
    testItemCollection.forEach((item) => sum += countItems(item.children));
    sum += testItemCollection.size;

    return sum;
};

describe('Extension Test', () => {
    const context: any = { subscriptions: { push: jest.fn() } };
    let cwd: string;

    describe('PHPUnit', () => {
        const phpBinary = 'php';
        const PHPUNIT_VERSION: string = getPhpUnitVersion();

        const root = phpUnitProject('');

        beforeEach(() => {
            setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: Uri.file(root) }]);
            setTextDocuments(globTextDocuments('**/*Test.php', expect.objectContaining({ cwd: root })));
            jest.clearAllMocks();
        });

        describe('PHPUnit activate()', () => {
            beforeEach(async () => {
                context.subscriptions.push.mockReset();
                cwd = normalPath(root);
                const configuration = workspace.getConfiguration('phpunit');
                await configuration.update('php', phpBinary);
                await configuration.update('phpunit', 'vendor/bin/phpunit');
                await configuration.update('args', []);
            });

            afterEach(() => jest.clearAllMocks());

            it('should load tests', async () => {
                await activate(context);
                const ctrl = getTestController();
                const uri = Uri.file(join(root, 'tests/AssertionsTest.php'));
                const itemId = `Assertions (Recca0120\\VSCode\\Tests\\Assertions)`;

                const parent = findTest(ctrl.items, itemId)!;
                const child = parent.children.get(`${itemId}::Passed`);

                expect(parent).toEqual(
                    expect.objectContaining({
                        id: itemId,
                        uri: expect.objectContaining({ fsPath: uri.fsPath }),
                        label: '$(symbol-class) AssertionsTest',
                    }),
                );

                expect(child).toEqual(
                    expect.objectContaining({
                        id: `${itemId}::Passed`,
                        uri: expect.objectContaining({ fsPath: uri.fsPath }),
                        label: '$(symbol-method) test_passed',
                        range: {
                            start: { line: 11, character: 4 },
                            end: { line: 14, character: 5 },
                            // end: {line: 11, character: 29},
                        },
                    }),
                );

                expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
                expect(window.createOutputChannel).toHaveBeenCalledWith('PHPUnit', 'phpunit');
                expect(tests.createTestController).toHaveBeenCalledWith('phpUnitTestController', 'PHPUnit');
                expect(commands.registerCommand).toHaveBeenCalledWith('phpunit.reload', expect.any(Function));
                expect(commands.registerCommand).toHaveBeenCalledWith('phpunit.run-all', expect.any(Function));
                expect(commands.registerCommand).toHaveBeenCalledWith('phpunit.run-file', expect.any(Function));
                expect(commands.registerCommand).toHaveBeenCalledWith('phpunit.run-test-at-cursor', expect.any(Function));
                expect(commands.registerCommand).toHaveBeenCalledWith('phpunit.rerun', expect.any(Function));
                expect(context.subscriptions.push).toHaveBeenCalledTimes(9);
            });

            it('should run all tests', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);
                const request = { include: undefined, exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(
                    phpBinary,
                    ['vendor/bin/phpunit', '--colors=never', '--teamcity'],
                    expect.objectContaining({ cwd }),
                );

                const expected = semver.gte(PHPUNIT_VERSION, '10.0.0')
                    ? { enqueued: 28, started: 35, passed: 23, failed: 10, end: 1 }
                    : { enqueued: 28, started: 29, passed: 16, failed: 11, end: 1 };

                expectTestResultCalled(ctrl, expected);
            });

            it('should run test by namespace', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);
                const id = `namespace:Tests (Recca0120\\VSCode\\Tests)`;
                const request = { include: [findTest(ctrl.items, id)], exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/phpunit',
                    '--filter=^(Recca0120\\\\VSCode\\\\Tests.*)( with (data set )?.*)?$',
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));

                const expected = semver.gte(PHPUNIT_VERSION, '10.0.0')
                    ? { enqueued: 27, started: 34, passed: 23, failed: 9, end: 1 }
                    : { enqueued: 27, started: 28, passed: 16, failed: 10, end: 1 };

                expectTestResultCalled(ctrl, expected);
            });

            it('should run test suite', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);
                const id = `Assertions (Recca0120\\VSCode\\Tests\\Assertions)`;
                const request = { include: [findTest(ctrl.items, id)], exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/phpunit',
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));

                expectTestResultCalled(ctrl, { enqueued: 9, started: 12, passed: 6, failed: 4, end: 1 });
            });

            it('should run test case', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);

                const method = 'test_throw_exception';
                const id = `Calculator (Recca0120\\VSCode\\Tests\\Calculator)::Throw exception`;

                const pattern = new RegExp(
                    `--filter=["']?\\^\\.\\*::\\(${method}\\)\\( with \\(data set \\)\\?\\.\\*\\)\\?\\$["']?`,
                );

                const request = { include: [findTest(ctrl.items, id)], exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/phpunit',
                    expect.stringMatching(pattern),
                    normalPath(phpUnitProject('tests/CalculatorTest.php')),
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));

                expectTestResultCalled(ctrl, { enqueued: 1, started: 1, passed: 0, failed: 1, end: 1 });

                const { failed } = getTestRun(ctrl);
                const [, message] = (failed as jest.Mock).mock.calls.find(([test]) => test.id === id);

                expect(message.location).toEqual(expect.objectContaining({
                    range: {
                        start: { line: 53, character: 0 },
                        end: { line: 53, character: 0 },
                    },
                }));
            });

            it('should refresh tests', async () => {
                await activate(context);

                const ctrl = getTestController();

                await ctrl.refreshHandler();
            });

            it('should resolve tests', async () => {
                await activate(context);

                const ctrl = getTestController();

                await ctrl.resolveHandler();

                expect(countItems(ctrl.items)).toEqual(47);
            });

            it('should resolve tests without phpunit.xml', async () => {
                jest.spyOn(Configuration.prototype, 'getConfigurationFile')
                    .mockReturnValueOnce(undefined as any);

                await activate(context);

                const ctrl = getTestController();

                await ctrl.resolveHandler();

                expect(countItems(ctrl.items)).toEqual(47);
            });

            it('should resolve tests with phpunit.xml.dist', async () => {
                await workspace.getConfiguration('phpunit').update('args', [
                    '-c', phpUnitProject('phpunit.xml.dist'),
                ]);

                await activate(context);

                const ctrl = getTestController();

                await ctrl.resolveHandler();

                expect(countItems(ctrl.items)).toEqual(14);
            });

            it('run phpunit.run-file', async () => {
                Object.defineProperty(window, 'activeTextEditor', {
                    value: { document: { uri: Uri.file(phpUnitProject('tests/AssertionsTest.php')) } },
                    enumerable: true,
                    configurable: true,
                });

                await activate(context);

                await commands.executeCommand('phpunit.run-file');

                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/phpunit',
                    // '--filter=^.*::(test_passed)( with data set .*)?$',
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));
            });

            it('run phpunit.run-test-at-cursor', async () => {
                await activate(context);

                Object.defineProperty(window, 'activeTextEditor', {
                    value: {
                        document: { uri: Uri.file(phpUnitProject('tests/AssertionsTest.php')) },
                        selection: { active: { line: 13, character: 14 } },
                    },
                    enumerable: true,
                    configurable: true,
                });

                await commands.executeCommand('phpunit.run-test-at-cursor');

                const method = 'test_passed';
                const pattern = new RegExp(
                    `--filter=["']?\\^\\.\\*::\\(${method}\\)\\( with \\(data set \\)\\?\\.\\*\\)\\?\\$["']?`,
                );
                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/phpunit',
                    expect.stringMatching(pattern),
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));
            });
        });
    });

    describe('PEST', () => {
        const phpBinary = 'php';
        // const phpBinary = '/opt/homebrew/Cellar/php@8.0/8.0.30_5/bin/php';
        const PHP_VERSION: string = getPhpVersion(phpBinary);
        const isPestV1 = semver.gte(PHP_VERSION, '8.0.0') && semver.lt(PHP_VERSION, '8.1.0');
        const isPestV2 = semver.gte(PHP_VERSION, '8.1.0') && semver.lt(PHP_VERSION, '8.2.0');
        const isPestV3 = semver.gte(PHP_VERSION, '8.2.0');
        const isPest = isPestV1 || isPestV2 || isPestV3;

        if (!isPest) {
            return;
        }

        const root = pestProject('');

        beforeEach(() => {
            setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: Uri.file(root) }]);
            setTextDocuments(globTextDocuments('**/*Test.php', expect.objectContaining({ cwd: root })));
            jest.clearAllMocks();
        });

        describe('PEST activate()', () => {
            beforeEach(async () => {
                context.subscriptions.push.mockReset();
                cwd = normalPath(root);
                const configuration = workspace.getConfiguration('phpunit');
                await configuration.update('php', phpBinary);
                await configuration.update('phpunit', 'vendor/bin/pest');
                await configuration.update('args', []);
            });

            afterEach(() => jest.clearAllMocks());

            it('should run all tests', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);
                const request = { include: undefined, exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(
                    phpBinary,
                    ['vendor/bin/pest', '--colors=never', '--teamcity'],
                    expect.objectContaining({ cwd }),
                );

                let expected: any;
                if (isPestV1) {
                    expected = { enqueued: 64, started: 62, passed: 9, failed: 51, end: 1 };
                } else if (isPestV2) {
                    expected = { enqueued: 64, started: 64, passed: 11, failed: 51, end: 1 };
                } else {
                    expected = { enqueued: 64, started: 66, passed: 13, failed: 51, end: 1 };
                }

                expectTestResultCalled(ctrl, expected);
            });

            it('should run test case', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);

                const method = 'test_description';
                const id = `tests/Unit/ExampleTest.php::test_description`;

                const pattern = new RegExp(
                    `--filter=["']?\\^\\.\\*::\\(${method}\\)\\( with \\(data set \\)\\?\\.\\*\\)\\?\\$["']?`,
                );

                const request = { include: [findTest(ctrl.items, id)], exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/pest',
                    expect.stringMatching(pattern),
                    normalPath(pestProject('tests/Unit/ExampleTest.php')),
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));

                expectTestResultCalled(ctrl, { enqueued: 1, started: 1, passed: 0, failed: 1, end: 1 });
            });

            it('should run test case with dataset', async () => {
                await activate(context);
                const ctrl = getTestController();
                const runProfile = getRunProfile(ctrl);

                const method = 'it has emails';
                const id = `tests/Unit/ExampleTest.php::it has emails`;

                const pattern = new RegExp(
                    `--filter=["']?\\^\\.\\*::\\(${method}\\)\\( with \\(data set \\)\\?\\.\\*\\)\\?\\$["']?`,
                );

                const request = { include: [findTest(ctrl.items, id)], exclude: [], profile: runProfile };

                await runProfile.runHandler(request, new CancellationTokenSource().token);

                expect(spawn).toHaveBeenCalledWith(phpBinary, [
                    'vendor/bin/pest',
                    expect.stringMatching(pattern),
                    normalPath(pestProject('tests/Unit/ExampleTest.php')),
                    '--colors=never',
                    '--teamcity',
                ], expect.objectContaining({ cwd }));

                const expected = !isPestV1
                    ? { enqueued: 1, started: 3, passed: 3, failed: 0, end: 1 }
                    : { enqueued: 1, started: 2, passed: 2, failed: 0, end: 1 };

                expectTestResultCalled(ctrl, expected);
            });
        });
    });
});
