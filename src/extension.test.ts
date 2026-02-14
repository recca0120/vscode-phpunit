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
    detectPestStubs,
    detectPhpUnitStubs,
    getPhpUnitVersion,
    getPhpVersion,
    normalPath,
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

const getRunProfile = (ctrl: TestController, kind = TestRunProfileKind.Run) => {
    const profile = (ctrl.createRunProfile as Mock).mock.results[0].value;
    profile.kind = kind;

    return profile;
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

    const setupEnvironment = async (
        root: string,
        phpunitBinary: string,
        options?: { follow?: boolean },
    ) => {
        setWorkspaceFolders([{ index: 0, name: 'phpunit', uri: Uri.file(root) }]);
        setTextDocuments(globTextDocuments('**/*Test.php', { cwd: root, follow: options?.follow }));
        (context.subscriptions.push as unknown as Mock).mockReset();
        cwd = normalPath(root);
        const configuration = workspace.getConfiguration('phpunit');
        await configuration.update('php', phpBinary);
        await configuration.update('phpunit', phpunitBinary);
        await configuration.update('args', []);
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
        const runProfile = getRunProfile(ctrl, opts?.kind);
        const ids = opts?.include;
        const include = ids
            ? (Array.isArray(ids) ? ids : [ids]).map((id) => findTest(ctrl.items, id))
            : undefined;
        const request = { include, exclude: [], profile: runProfile };
        await runProfile.runHandler(request, new CancellationTokenSource().token);
        return ctrl;
    };

    describe('PHPUnit', () => {
        const PHPUNIT_VERSION: string = getPhpUnitVersion();
        const root = phpUnitProject('');

        beforeEach(() => setupEnvironment(root, 'vendor/bin/phpunit'));
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
                        start: expect.objectContaining({ line: 11, character: 4 }),
                        end: expect.objectContaining({ line: 14, character: 5 }),
                    },
                }),
            );

            expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
            expect(window.createOutputChannel).toHaveBeenCalledWith('PHPUnit', 'phpunit');
            expect(tests.createTestController).toHaveBeenCalledWith(
                'phpUnitTestController',
                'PHPUnit',
            );
            expect(commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.reload',
                expect.any(Function),
            );
            expect(commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.run-all',
                expect.any(Function),
            );
            expect(commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.run-file',
                expect.any(Function),
            );
            expect(commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.run-test-at-cursor',
                expect.any(Function),
            );
            expect(commands.registerCommand).toHaveBeenCalledWith(
                'phpunit.rerun',
                expect.any(Function),
            );
            expect(context.subscriptions.push).toHaveBeenCalledTimes(7);
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

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                ['vendor/bin/phpunit', '--colors=never', '--teamcity'],
                expect.objectContaining({ cwd }),
            );

            const expected = semver.gte(PHPUNIT_VERSION, '10.0.0')
                ? { enqueued: 28, started: 26, passed: 15, failed: 9, end: 1 }
                : { enqueued: 28, started: 29, passed: 16, failed: 11, end: 1 };

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test by namespace', async () => {
            const ctrl = await activateAndRun({ include: 'namespace:Tests' });

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/phpunit',
                    `--filter=^(Tests.*)(( with (data set )?.*)?)?$`,
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );

            const expected = semver.gte(PHPUNIT_VERSION, '10.0.0')
                ? { enqueued: 27, started: 25, passed: 15, failed: 8, end: 1 }
                : { enqueued: 27, started: 28, passed: 16, failed: 10, end: 1 };

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test suite', async () => {
            const ctrl = await activateAndRun({ include: 'Assertions (Tests\\Assertions)' });

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/phpunit',
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );

            expectTestResultCalled(ctrl, {
                enqueued: 9,
                started: 6,
                passed: 1,
                failed: 3,
                end: 1,
            });
        });

        it('should run test case', async () => {
            const method = 'test_throw_exception';
            const id = `Calculator (Tests\\Calculator)::Throw exception`;
            const ctrl = await activateAndRun({ include: id });

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/phpunit',
                    expect.stringMatching(filterPattern(method)),
                    normalPath(phpUnitProject('tests/CalculatorTest.php')),
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );

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

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/phpunit',
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );
        });

        it('run phpunit.run-test-at-cursor', async () => {
            await activate(context);
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 13,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            const method = 'test_passed';

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/phpunit',
                    expect.stringMatching(filterPattern(method)),
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );
        });
    });

    describe('Xdebug', () => {
        const root = phpUnitProject('');

        beforeEach(() => setupEnvironment(root, 'vendor/bin/phpunit'));
        afterEach(() => vi.clearAllMocks());

        it('Debug', async () => {
            await activateAndRun({ kind: TestRunProfileKind.Debug });

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                expect.arrayContaining([
                    '-dxdebug.mode=debug',
                    '-dxdebug.start_with_request=1',
                    expect.stringMatching(/-dxdebug\.client_port=\d+/),
                    'vendor/bin/phpunit',
                    '--colors=never',
                    '--teamcity',
                ]),
                expect.objectContaining({
                    env: expect.objectContaining({
                        XDEBUG_MODE: 'debug',
                    }),
                }),
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
                expect(spawn).toHaveBeenCalledWith(
                    phpBinary,
                    [
                        '-dxdebug.mode=coverage',
                        'vendor/bin/phpunit',
                        expect.stringMatching(file),
                        '--colors=never',
                        '--teamcity',
                        '--coverage-clover',
                        expect.stringMatching(`phpunit-${i}.xml`),
                    ],
                    expect.objectContaining({
                        env: expect.objectContaining({
                            XDEBUG_MODE: 'coverage',
                        }),
                    }),
                );
            });
        });
    });

    describe('paratest', () => {
        const PHP_VERSION: string = getPhpVersion(phpBinary);
        const root = phpUnitProject('');

        if (semver.lt(PHP_VERSION, '7.3.0')) {
            return;
        }

        beforeEach(async () => {
            await setupEnvironment(root, 'vendor/bin/paratest');
            window.showErrorMessage = vi.fn();
        });

        afterEach(() => vi.clearAllMocks());

        it('run phpunit.run-test-at-cursor', async () => {
            await activate(context);
            const ctrl = getTestController();
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 13,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            const method = 'test_passed';

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/paratest',
                    expect.stringMatching(filterPattern(method)),
                    normalPath(phpUnitProject('tests/AssertionsTest.php')),
                    '--colors=never',
                    '--teamcity',
                    '--functional',
                ],
                expect.objectContaining({ cwd }),
            );

            expect(window.showErrorMessage).not.toHaveBeenCalled();

            expectTestResultCalled(ctrl, { enqueued: 1, started: 1, passed: 1, failed: 0, end: 1 });
        });
    });

    describe('PEST', () => {
        const PHP_VERSION: string = getPhpVersion(phpBinary);
        const isPestV1 = semver.gte(PHP_VERSION, '8.0.0') && semver.lt(PHP_VERSION, '8.1.0');
        const isPestV2 = semver.gte(PHP_VERSION, '8.1.0') && semver.lt(PHP_VERSION, '8.2.0');
        const isPestV3 = semver.gte(PHP_VERSION, '8.2.0');
        const isPest = isPestV1 || isPestV2 || isPestV3;

        if (!isPest) {
            return;
        }

        const root = pestProject('');

        beforeEach(() => setupEnvironment(root, 'vendor/bin/pest'));
        afterEach(() => vi.clearAllMocks());

        it('should run all tests', async () => {
            const ctrl = await activateAndRun();

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                ['vendor/bin/pest', '--colors=never', '--teamcity'],
                expect.objectContaining({ cwd }),
            );

            let expected: Record<string, number>;
            if (isPestV1) {
                expected = { enqueued: 68, started: 62, passed: 9, failed: 51, end: 1 };
            } else if (isPestV2) {
                expected = { enqueued: 68, started: 64, passed: 11, failed: 51, end: 1 };
            } else {
                expected = { enqueued: 68, started: 70, passed: 16, failed: 52, end: 1 };
            }

            expectTestResultCalled(ctrl, expected);
        });

        it('should run test case', async () => {
            const method = 'test_description';
            const id = `tests/Unit/ExampleTest.php::test_description`;
            const ctrl = await activateAndRun({ include: id });

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/pest',
                    expect.stringMatching(filterPattern(method)),
                    normalPath(pestProject('tests/Unit/ExampleTest.php')),
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );

            expectTestResultCalled(ctrl, {
                enqueued: 1,
                started: 1,
                passed: 0,
                failed: 1,
                end: 1,
            });
        });

        it('should run test case with dataset', async () => {
            const method = `it has user's email`;
            const id = `tests/Unit/ExampleTest.php::${method}`;
            const ctrl = await activateAndRun({ include: id });

            expect(spawn).toHaveBeenCalledWith(
                phpBinary,
                [
                    'vendor/bin/pest',
                    expect.stringMatching(filterPattern(method)),
                    normalPath(pestProject('tests/Unit/ExampleTest.php')),
                    '--colors=never',
                    '--teamcity',
                ],
                expect.objectContaining({ cwd }),
            );

            const expected = !isPestV1
                ? { enqueued: 1, started: 3, passed: 3, failed: 0, end: 1 }
                : { enqueued: 1, started: 2, passed: 2, failed: 0, end: 1 };

            expectTestResultCalled(ctrl, expected);
        });
    });

    const additionalStubs = detectPhpUnitStubs();

    if (additionalStubs.length > 0) {
        describe.each(additionalStubs)('PHPUnit on $name (PHPUnit $phpUnitVersion)', ({
            root,
            phpUnitVersion,
        }) => {
            beforeEach(() => setupEnvironment(root, 'vendor/bin/phpunit', { follow: true }));
            afterEach(() => vi.clearAllMocks());

            it('should run all tests', async () => {
                const ctrl = await activateAndRun();

                let expected: Record<string, number>;
                if (semver.gte(phpUnitVersion, '12.0.0')) {
                    expected = { enqueued: 28, started: 26, passed: 15, failed: 9, end: 1 };
                } else if (semver.gte(phpUnitVersion, '10.0.0')) {
                    expected = { enqueued: 28, started: 35, passed: 23, failed: 10, end: 1 };
                } else {
                    expected = { enqueued: 28, started: 29, passed: 16, failed: 11, end: 1 };
                }

                expectTestResultCalled(ctrl, expected);
            });

            it('should run test suite', async () => {
                const ctrl = await activateAndRun({
                    include: 'Assertions (Tests\\Assertions)',
                });

                const expected = semver.gte(phpUnitVersion, '12.0.0')
                    ? { enqueued: 9, started: 6, passed: 1, failed: 3, end: 1 }
                    : { enqueued: 9, started: 12, passed: 6, failed: 4, end: 1 };

                expectTestResultCalled(ctrl, expected);
            });
        });
    }

    const additionalPestStubs = detectPestStubs();

    if (additionalPestStubs.length > 0) {
        describe.each(additionalPestStubs)('PEST on $name (Pest $pestVersion)', ({
            root,
            pestVersion,
        }) => {
            beforeEach(() => setupEnvironment(root, 'vendor/bin/pest', { follow: true }));
            afterEach(() => vi.clearAllMocks());

            it('should run all tests', async () => {
                const ctrl = await activateAndRun();

                let expected: Record<string, number>;
                if (semver.gte(pestVersion, '4.0.0')) {
                    expected = { enqueued: 68, started: 70, passed: 13, failed: 55, end: 1 };
                } else if (semver.gte(pestVersion, '3.0.0')) {
                    expected = { enqueued: 68, started: 70, passed: 16, failed: 52, end: 1 };
                } else {
                    expected = { enqueued: 68, started: 63, passed: 10, failed: 51, end: 1 };
                }

                expectTestResultCalled(ctrl, expected);
            });
        });
    }
});
