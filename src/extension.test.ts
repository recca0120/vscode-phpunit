import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type GlobOptions, glob } from 'glob';
import * as semver from 'semver';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
    CancellationTokenSource,
    commands,
    debug,
    type TestController,
    type TestItem,
    type TestItemCollection,
    TestRunRequest,
    TestRunProfileKind,
    type TextDocument,
    tests,
    Uri,
    type WorkspaceFolder,
    window,
    workspace,
} from 'vscode';
import { Configuration } from './Configuration';
import { activate } from './extension';
import {
    detectParatestStubs,
    detectPestStubs,
    detectPhpUnitStubs,
    pestProject,
    phpUnitProject,
} from './PHPUnit/__tests__/utils';

vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn(actual.spawn) };
});

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

const getOutputChannel = () => {
    return (window.createOutputChannel as Mock).mock.results[0].value;
};

const getTestController = () => {
    return (tests.createTestController as Mock).mock.results[0].value;
};

const getTestRunProfile = (ctrl: TestController, kind = TestRunProfileKind.Run) => {
    const testRunProfile = (ctrl.createRunProfile as Mock).mock.results[0].value;
    testRunProfile.kind = kind;

    return testRunProfile;
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

const getTestRun = (ctrl: TestController) => {
    return (ctrl.createTestRun as Mock).mock.results[0].value;
};

const expectTestResultCalled = (ctrl: TestController, expected: Record<string, number>) => {
    const { enqueued, started, passed, failed, end } = getTestRun(ctrl);

    expect({
        enqueued: enqueued.mock.calls.length,
        started: started.mock.calls.length,
        passed: passed.mock.calls.length,
        failed: failed.mock.calls.length,
        end: end.mock.calls.length,
    }).toEqual(expected);

    expect(getOutputChannel().appendLine).toHaveBeenCalled();
};

const countItems = (testItemCollection: TestItemCollection) => {
    let sum = 0;
    testItemCollection.forEach((item) => (sum += countItems(item.children)));
    sum += testItemCollection.size;

    return sum;
};

const resolveExpected = <T>(version: string, map: [string, T][], fallback: T): T => {
    for (const [minVersion, expected] of map) {
        if (semver.gte(version, minVersion)) return expected;
    }
    return fallback;
};

describe('Extension Test', () => {
    const phpBinary = 'php';

    const filterPattern = (method: string) =>
        new RegExp(
            `--filter=["']?\\^\\.\\*::\\(${method}\\)\\(\\( with \\(data set \\)\\?\\.\\*\\)\\?\\)\\?\\$["']?`,
        );

    const context = {
        subscriptions: { push: vi.fn() },
    } as unknown as import('vscode').ExtensionContext;
    let cwd: string;

    const setupEnvironment = async (root: string, phpunitBinary: string, args: string[] = []) => {
        setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: Uri.file(root) }]);
        setTextDocuments(globTextDocuments('**/*Test.php', { cwd: root }));
        (context.subscriptions.push as unknown as Mock).mockReset();
        cwd = root;
        const configuration = workspace.getConfiguration('phpunit');
        await configuration.update('php', phpBinary);
        await configuration.update('phpunit', phpunitBinary);
        await configuration.update('args', args);
    };

    const setActiveTextEditor = (file: string, selection?: { line: number; character: number }) => {
        Object.defineProperty(window, 'activeTextEditor', {
            value: {
                document: { uri: Uri.file(file) },
                ...(selection && { selection: { active: selection } }),
            },
            enumerable: true,
            configurable: true,
        });
    };

    const activateAndRun = async (opts?: {
        include?: string | string[];
        kind?: TestRunProfileKind;
    }) => {
        await activate(context);
        const ctrl = getTestController();
        const testRunProfile = getTestRunProfile(ctrl, opts?.kind);
        const ids = opts?.include;
        const include = ids ? [ids].flat().map((id) => findTest(ctrl.items, id)) : undefined;
        const request = { include, exclude: [], profile: testRunProfile };
        await testRunProfile.runHandler(request, new CancellationTokenSource().token);
        return ctrl;
    };

    const expectSpawnCalled = (
        args: (string | RegExp)[],
        envOverrides?: Record<string, string>,
    ) => {
        expect(spawn).toHaveBeenCalledWith(
            phpBinary,
            expect.arrayContaining(
                args.map((a) =>
                    a instanceof RegExp
                        ? expect.stringMatching(a)
                        : expect.stringMatching(new RegExp(`^${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
                ),
            ),
            expect.objectContaining({
                cwd: expect.stringMatching(new RegExp(`^${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
                ...(envOverrides && { env: expect.objectContaining(envOverrides) }),
            }),
        );
    };

    describe.each(detectPhpUnitStubs())('PHPUnit on $name (PHPUnit $phpUnitVersion)', ({
        root,
        phpUnitVersion,
        binary,
        args,
    }) => {
        beforeEach(() => setupEnvironment(root, binary, args));
        afterEach(() => vi.clearAllMocks());

        it('should load tests', async () => {
            await activate(context);
            const ctrl = getTestController();
            const uri = Uri.file(join(root, 'tests/AssertionsTest.php'));
            const itemId = `Assertions (Tests\\Assertions)`;

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
                        start: expect.objectContaining({ line: 15, character: 4 }),
                        end: expect.objectContaining({ line: 18, character: 5 }),
                    },
                    tags: expect.arrayContaining([
                        expect.objectContaining({ id: 'group:integration' }),
                    ]),
                }),
            );

            expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
            expect(window.createOutputChannel).toHaveBeenCalledWith('PHPUnit', 'phpunit');
            expect(tests.createTestController).toHaveBeenCalledWith(
                'phpUnitTestController',
                'PHPUnit',
            );
            for (const cmd of [
                'phpunit.reload',
                'phpunit.run-all',
                'phpunit.run-file',
                'phpunit.run-test-at-cursor',
                'phpunit.run-by-group',
                'phpunit.rerun',
            ]) {
                expect(commands.registerCommand).toHaveBeenCalledWith(cmd, expect.any(Function));
            }
            expect(context.subscriptions.push).toHaveBeenCalledTimes(8);
        });

        it('should only update configuration when phpunit settings change', async () => {
            await activate(context);

            const onDidChangeConfig = workspace.onDidChangeConfiguration as Mock;
            const listenerCall = onDidChangeConfig.mock.calls.find(
                (call: unknown[]) => typeof call[0] === 'function',
            );
            expect(listenerCall).toBeDefined();
            const listener = listenerCall?.[0];

            const spy = vi.spyOn(Configuration.prototype, 'updateWorkspaceConfiguration');

            // phpunit config change → should update
            listener({ affectsConfiguration: (section: string) => section === 'phpunit' });
            expect(spy).toHaveBeenCalledTimes(1);

            spy.mockClear();

            // non-phpunit config change → should NOT update
            listener({ affectsConfiguration: (section: string) => section === 'editor' });
            expect(spy).not.toHaveBeenCalled();

            spy.mockRestore();
        });

        it('should run all tests', async () => {
            const ctrl = await activateAndRun();

            const expected = resolveExpected(
                phpUnitVersion,
                [
                    ['12.0.0', { enqueued: 28, started: 26, passed: 15, failed: 9, end: 1 }],
                    ['10.0.0', { enqueued: 28, started: 34, passed: 22, failed: 10, end: 1 }],
                ],
                { enqueued: 28, started: 29, passed: 16, failed: 11, end: 1 },
            );

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test by namespace', async () => {
            const ctrl = await activateAndRun({ include: 'namespace:Tests' });

            const expected = resolveExpected(
                phpUnitVersion,
                [
                    ['12.0.0', { enqueued: 27, started: 25, passed: 15, failed: 8, end: 1 }],
                    ['10.0.0', { enqueued: 27, started: 33, passed: 22, failed: 9, end: 1 }],
                ],
                { enqueued: 27, started: 28, passed: 16, failed: 10, end: 1 },
            );

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test suite', async () => {
            const ctrl = await activateAndRun({
                include: 'Assertions (Tests\\Assertions)',
            });

            const expected = resolveExpected(
                phpUnitVersion,
                [
                    ['12.0.0', { enqueued: 9, started: 6, passed: 1, failed: 3, end: 1 }],
                    ['10.0.0', { enqueued: 9, started: 11, passed: 5, failed: 4, end: 1 }],
                ],
                { enqueued: 9, started: 12, passed: 6, failed: 4, end: 1 },
            );

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test case', async () => {
            const id = `Calculator (Tests\\Calculator)::Throw exception`;
            const ctrl = await activateAndRun({ include: id });

            expectTestResultCalled(ctrl, {
                enqueued: 1,
                started: 1,
                passed: 0,
                failed: 1,
                end: 1,
            });

            const { failed } = getTestRun(ctrl);
            const [, message] = (failed as Mock).mock.calls.find(
                ([test]: { id: string }[]) => test.id === id,
            )!;

            expect(message.location).toEqual(
                expect.objectContaining({
                    range: {
                        start: expect.objectContaining({ line: 53, character: 0 }),
                        end: expect.objectContaining({ line: 53, character: 0 }),
                    },
                }),
            );
        });

        it('should run all tests with group arg', async () => {
            const configuration = workspace.getConfiguration('phpunit');
            await configuration.update('args', ['--group=integration']);

            await activateAndRun();

            expectSpawnCalled([
                binary,
                '--group=integration',
                '--colors=never',
                '--teamcity',
            ]);

            await configuration.update('args', []);
        });

        it('should run tests by selected group', async () => {
            await activate(context);
            (window.showQuickPick as Mock).mockResolvedValue('integration');

            await commands.executeCommand('phpunit.run-by-group');
            const testRunRequestCalls = (TestRunRequest as unknown as Mock).mock.calls;
            const [, , profile] = testRunRequestCalls[testRunRequestCalls.length - 1];

            expect(window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining(['integration']),
                expect.objectContaining({
                    placeHolder: 'Select a PHPUnit group to run',
                    title: 'Run Tests by Group',
                }),
            );
            expectSpawnCalled([
                binary,
                '--group=integration',
                '--colors=never',
                '--teamcity',
            ]);
            expect(profile).toBe(getTestRunProfile(getTestController()));
        });

        it('should discover tests before running selected group when tests are not preloaded', async () => {
            setTextDocuments([]);
            await activate(context);
            (window.showQuickPick as Mock).mockResolvedValue('integration');

            await commands.executeCommand('phpunit.run-by-group');

            expect(workspace.findFiles).toHaveBeenCalled();
            expect(window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining(['integration']),
                expect.objectContaining({
                    placeHolder: 'Select a PHPUnit group to run',
                    title: 'Run Tests by Group',
                }),
            );
            expectSpawnCalled([
                binary,
                '--group=integration',
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('should run class with group', async () => {
            await activateAndRun({ include: 'Attribute (Tests\\Attribute)' });

            expectSpawnCalled([
                binary,
                '--group=integration',
                Uri.file(phpUnitProject('tests/AttributeTest.php')).fsPath,
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('should run method with group', async () => {
            await activateAndRun({ include: 'Assertions (Tests\\Assertions)::Passed' });

            expectSpawnCalled([
                binary,
                filterPattern('test_passed'),
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('should run at cursor with group', async () => {
            await activate(context);
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 17,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            expectSpawnCalled([
                binary,
                filterPattern('test_passed'),
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                '--colors=never',
                '--teamcity',
            ]);
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

            expect(countItems(ctrl.items)).toEqual(46);
        });

        it('should resolve tests without phpunit.xml', async () => {
            const testsRoot = phpUnitProject('tests');
            setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: Uri.file(testsRoot) }]);
            setTextDocuments(
                globTextDocuments('**/*Test.php', expect.objectContaining({ cwd: testsRoot })),
            );
            await workspace.getConfiguration('phpunit').update('args', []);

            await activate(context);

            const ctrl = getTestController();

            await ctrl.resolveHandler();

            expect(countItems(ctrl.items)).toEqual(144);
        });

        it('should resolve tests with phpunit.xml.dist', async () => {
            await workspace
                .getConfiguration('phpunit')
                .update('args', ['-c', phpUnitProject('phpunit.xml.dist')]);

            await activate(context);

            const ctrl = getTestController();

            await ctrl.resolveHandler();

            expect(countItems(ctrl.items)).toEqual(13);
        });

        it('run phpunit.run-file', async () => {
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'));
            await activate(context);

            await commands.executeCommand('phpunit.run-file');

            expectSpawnCalled([
                binary,
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('run phpunit.run-test-at-cursor', async () => {
            await activate(context);
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 17,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            expectSpawnCalled([
                binary,
                filterPattern('test_passed'),
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                '--colors=never',
                '--teamcity',
            ]);
        });

        describe('Xdebug', () => {
            it('Debug', async () => {
                await activateAndRun({ kind: TestRunProfileKind.Debug });

                expectSpawnCalled(
                    [
                        '-dxdebug.mode=debug',
                        '-dxdebug.start_with_request=1',
                        /-dxdebug\.client_port=\d+/,
                        binary,
                        '--colors=never',
                        '--teamcity',
                    ],
                    { XDEBUG_MODE: 'debug' },
                );

                expect(debug.startDebugging).toHaveBeenCalledWith(expect.anything(), {
                    type: 'php',
                    request: 'launch',
                    name: 'PHPUnit',
                    port: expect.any(Number),
                });
                expect(debug.stopDebugging).toHaveBeenCalledWith({ type: 'php' });
            });

            it('Coverage', async () => {
                await activateAndRun({
                    include: ['Assertions (Tests\\Assertions)', 'Calculator (Tests\\Calculator)'],
                    kind: TestRunProfileKind.Coverage,
                });
                ['AssertionsTest.php', 'CalculatorTest.php'].forEach((file, i) => {
                    expectSpawnCalled(
                        [
                            '-dxdebug.mode=coverage',
                            binary,
                            new RegExp(file),
                            '--colors=never',
                            '--teamcity',
                            '--coverage-clover',
                            new RegExp(`phpunit-${i}.xml`),
                        ],
                        { XDEBUG_MODE: 'coverage' },
                    );
                });
            });
        });
    });

    describe.each(detectParatestStubs())('paratest on $name', ({ root, binary, args }) => {
        beforeEach(async () => {
            await setupEnvironment(root, binary, args);
            window.showErrorMessage = vi.fn();
        });

        afterEach(() => vi.clearAllMocks());

        it('run phpunit.run-test-at-cursor', async () => {
            await activate(context);
            const ctrl = getTestController();
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 17,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            const method = 'test_passed';

            expectSpawnCalled([
                binary,
                filterPattern(method),
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                '--colors=never',
                '--teamcity',
                '--functional',
            ]);

            expect(window.showErrorMessage).not.toHaveBeenCalled();

            expectTestResultCalled(ctrl, { enqueued: 1, started: 1, passed: 1, failed: 0, end: 1 });
        });
    });

    describe.each(detectPestStubs())('PEST on $name (Pest $pestVersion)', ({
        root,
        pestVersion,
        binary,
        args,
    }) => {
        beforeEach(() => setupEnvironment(root, binary, args));
        afterEach(() => vi.clearAllMocks());

        it('should run all tests', async () => {
            const ctrl = await activateAndRun();

            const expected = resolveExpected(
                pestVersion,
                [['3.0.0', { enqueued: 68, started: 70, passed: 13, failed: 55, end: 1 }]],
                { enqueued: 68, started: 63, passed: 10, failed: 51, end: 1 },
            );

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test case', async () => {
            const id = `tests/Unit/ExampleTest.php::test_description`;
            const ctrl = await activateAndRun({ include: id });

            expectTestResultCalled(ctrl, {
                enqueued: 1,
                started: 1,
                passed: 0,
                failed: 1,
                end: 1,
            });
        });

        it('should run test case with dataset', async () => {
            const id = `tests/Unit/ExampleTest.php::it has user's email`;
            const ctrl = await activateAndRun({ include: id });

            const expected = resolveExpected(
                pestVersion,
                [['3.0.0', { enqueued: 1, started: 3, passed: 3, failed: 0, end: 1 }]],
                { enqueued: 1, started: 2, passed: 2, failed: 0, end: 1 },
            );

            expectTestResultCalled(ctrl, expected);
        });

        it('should run all tests with group arg', async () => {
            const configuration = workspace.getConfiguration('phpunit');
            await configuration.update('args', ['--group=integration']);

            await activateAndRun();

            expectSpawnCalled([
                binary,
                '--group=integration',
                '--colors=never',
                '--teamcity',
            ]);

            await configuration.update('args', []);
        });
    });
});
