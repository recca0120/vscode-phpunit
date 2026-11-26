import { type ChildProcess, spawn } from 'node:child_process';
import { join, relative, sep } from 'node:path';
import {
    CloverParser,
    type FileCoverageData,
    initTreeSitter,
    semverGte,
    TestType,
} from '@vscode-phpunit/phpunit';
import {
    detectParatestStubs,
    detectPestStubs,
    detectPhpUnitStubs,
    phpUnitProject,
} from '@vscode-phpunit/phpunit/testing';
import { minimatch } from 'minimatch';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
    CancellationTokenSource,
    commands,
    debug,
    type ExtensionContext,
    type TestItem,
    TestRunProfileKind,
    tests,
    Uri,
    type WorkspaceFolder,
    window,
    workspace,
} from 'vscode';
import { createExtensionContext } from '../fakes/extensionContext';
import { openWorkspace, setActiveTextEditor } from '../fakes/openWorkspace';
import { changeWorkspaceFolders } from '../fakes/vscodeEvents';
import { phpUnitFixture } from '../test-support/fixtures';
import { expectSpawned } from '../test-support/process';
import { childIds, childLabels, countItems, findItem } from '../test-support/testItems';
import { activateExtension, type Extension } from './acceptance/harness';
import { Configuration } from './Configuration';
import { icon } from './TestTree/TestHierarchyBuilder';

type FakeFileSystemWatcher = { disposed: boolean };

vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn(actual.spawn) };
});

const expectTestResultCalled = (extension: Extension, expected: Record<string, number>) => {
    const { enqueued, started, passed, failed, end } = vi.mocked(extension.testRuns()[0]);

    expect({
        enqueued: enqueued.mock.calls.length,
        started: started.mock.calls.length,
        passed: passed.mock.calls.length,
        failed: failed.mock.calls.length,
        end: end.mock.calls.length,
    }).toEqual(expected);

    expect(extension.outputChannel.appendLine).toHaveBeenCalled();
};

const byVersion = <T>(version: string, map: [string, T][], fallback: T): T => {
    for (const [minVersion, expected] of map) {
        if (semverGte(version, minVersion)) return expected;
    }
    return fallback;
};

const stubs = {
    phpUnit: detectPhpUnitStubs(),
    paratest: detectParatestStubs(),
    pest: detectPestStubs(),
};

describe('Extension', () => {
    beforeAll(async () => initTreeSitter());

    const phpBinary = 'php';

    const methodFilter = (method: string) =>
        new RegExp(
            `--filter=["']?/\\^\\.\\*::\\(${method}\\)\\(\\( with \\(data set \\)\\?\\.\\*\\)\\?\\)\\?\\$/["']?`,
        );

    let context: ExtensionContext;

    beforeEach(() => {
        context = createExtensionContext();
    });

    const phpUnitSettings = (binary: string, args: string[] = []) => ({
        php: phpBinary,
        phpunit: binary,
        args,
    });

    const activateAndRun = async (opts?: {
        include?: string | string[];
        kind?: TestRunProfileKind;
    }) => {
        const extension = await activateExtension(context);
        await extension.run(opts?.include, { kind: opts?.kind });
        return extension;
    };

    describe('cancellation', () => {
        const root = phpUnitFixture.root;

        beforeEach(async () => {
            await openWorkspace({ root, settings: phpUnitSettings('vendor/bin/phpunit') });
        });

        afterEach(() => vi.clearAllMocks());

        it('stops starting processes once the run is cancelled', async () => {
            const cancellation = new CancellationTokenSource();
            const spawnSpy = vi.mocked(spawn);
            const originalSpawn = spawnSpy.getMockImplementation();
            if (!originalSpawn) {
                throw new Error('Mock implementation not found');
            }

            spawnSpy.mockImplementation((...args: Parameters<typeof spawn>) => {
                cancellation.cancel();
                return originalSpawn(...args) as ChildProcess;
            });

            try {
                const extension = await activateExtension(context);
                const { controller } = extension;
                const include = [phpUnitFixture.items.assertions, phpUnitFixture.items.calculator]
                    .map((id) => findItem(controller.items, id))
                    .filter((item): item is TestItem => item !== undefined);

                expect(include).toHaveLength(2);

                spawnSpy.mockClear();
                await extension.run(include, { token: cancellation.token });

                expect(cancellation.token.isCancellationRequested).toBe(true);
                expect(spawn).toHaveBeenCalledTimes(1);
            } finally {
                spawnSpy.mockImplementation(originalSpawn);
            }
        });

        it('marks the tests that did not run as skipped without an error dialog', async () => {
            const cancellation = new CancellationTokenSource();
            const spawnSpy = vi.mocked(spawn);
            const originalSpawn = spawnSpy.getMockImplementation();
            if (!originalSpawn) {
                throw new Error('Mock implementation not found');
            }

            spawnSpy.mockImplementation((...args: Parameters<typeof spawn>) => {
                cancellation.cancel();
                return originalSpawn(...args) as ChildProcess;
            });
            window.showErrorMessage = vi.fn();

            try {
                const extension = await activateExtension(context);
                const { controller } = extension;
                const item = findItem(controller.items, phpUnitFixture.items.assertions);
                if (!item) {
                    throw new Error('Test item not found');
                }

                await extension.run([item], { token: cancellation.token });

                expect(extension.testRuns()[0].skipped).toHaveBeenCalled();
                expect(window.showErrorMessage).not.toHaveBeenCalled();
            } finally {
                spawnSpy.mockImplementation(originalSpawn);
            }
        });
    });

    describe.each(stubs.phpUnit)(
        'PHPUnit $name ($phpUnitVersion)',
        ({ root, phpUnitVersion, binary, args }) => {
            beforeEach(() => openWorkspace({ root, settings: phpUnitSettings(binary, args) }));
            afterEach(() => vi.clearAllMocks());

            describe('activation', () => {
                it('registers its commands and lists test classes with their methods', async () => {
                    const extension = await activateExtension(context);
                    const { controller } = extension;
                    const uri = Uri.file(join(root, 'tests/AssertionsTest.php'));
                    const itemId = `Assertions (Tests\\Assertions)`;

                    const parent = findItem(controller.items, itemId);
                    expect(parent).toBeDefined();
                    const child = parent?.children.get(`${itemId}::Passed`);

                    expect(parent).toEqual(
                        expect.objectContaining({
                            id: itemId,
                            uri: expect.objectContaining({ fsPath: uri.fsPath }),
                            label: `${icon(TestType.class)} AssertionsTest`,
                        }),
                    );

                    expect(child).toEqual(
                        expect.objectContaining({
                            id: `${itemId}::Passed`,
                            uri: expect.objectContaining({ fsPath: uri.fsPath }),
                            label: `${icon(TestType.method)} test_passed`,
                            range: {
                                start: expect.objectContaining({ line: 15, character: 4 }),
                                end: expect.objectContaining({ line: 18, character: 5 }),
                            },
                            tags: expect.arrayContaining([
                                expect.objectContaining({ id: 'group:integration' }),
                            ]),
                        }),
                    );

                    expect(workspace.getConfiguration).toHaveBeenCalledWith(
                        'phpunit',
                        expect.anything(),
                    );
                    expect(window.createOutputChannel).toHaveBeenCalledWith(
                        'PHPUnit Debug',
                        'phpunit',
                    );
                    expect(tests.createTestController).toHaveBeenCalledWith('phpunit', 'PHPUnit');
                    for (const cmd of [
                        'phpunit.reload',
                        'phpunit.run-all',
                        'phpunit.run-file',
                        'phpunit.run-test-at-cursor',
                        'phpunit.run-by-group',
                        'phpunit.rerun',
                    ]) {
                        expect(commands.registerCommand).toHaveBeenCalledWith(
                            cmd,
                            expect.any(Function),
                        );
                    }
                    expect(context.subscriptions.push).toHaveBeenCalledTimes(5);
                });
            });

            describe('test discovery', () => {
                it('includes test methods of a trait whose file does not match the testsuite suffix', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        childLabels(
                            extension.controller.items,
                            'Shared Trait User (Tests\\SharedTraitUser)',
                        ),
                    ).toEqual([
                        `${icon(TestType.method)} test_from_shared_trait`,
                        `${icon(TestType.method)} test_own`,
                    ]);
                });

                it('gives inherited and trait test methods the id of the class PHPUnit runs them on', async () => {
                    const extension = await activateExtension(context);
                    const { controller } = extension;
                    await extension.resolve();

                    expect(
                        childIds(
                            controller.items,
                            'Concrete From Abstract (Tests\\ConcreteFromAbstract)',
                        ),
                    ).toEqual(['Concrete From Abstract (Tests\\ConcreteFromAbstract)::Abstract']);
                    expect(
                        childIds(controller.items, 'Concrete With Own (Tests\\ConcreteWithOwn)'),
                    ).toEqual([
                        'Concrete With Own (Tests\\ConcreteWithOwn)::Abstract',
                        'Concrete With Own (Tests\\ConcreteWithOwn)::Own method',
                    ]);
                    expect(
                        childIds(controller.items, 'Shared Trait User (Tests\\SharedTraitUser)'),
                    ).toEqual([
                        'Shared Trait User (Tests\\SharedTraitUser)::From shared trait',
                        'Shared Trait User (Tests\\SharedTraitUser)::Own',
                    ]);
                    expect(
                        childIds(controller.items, 'Use Trait (Tests\\SubFolder\\UseTrait)'),
                    ).toEqual([
                        'Use Trait (Tests\\SubFolder\\UseTrait)::From another',
                        'Use Trait (Tests\\SubFolder\\UseTrait)::From trait',
                        'Use Trait (Tests\\SubFolder\\UseTrait)::Shared',
                        'Use Trait (Tests\\SubFolder\\UseTrait)::Shared alias',
                        'Use Trait (Tests\\SubFolder\\UseTrait)::Use trait',
                    ]);
                });

                it('includes test methods inherited through a parent class from vendor', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        childLabels(
                            extension.controller.items,
                            'Extends Vendor Base (Tests\\ExtendsVendorBase)',
                        ),
                    ).toEqual([
                        `${icon(TestType.method)} test_from_vendor_base`,
                        `${icon(TestType.method)} test_own`,
                    ]);
                });

                it('includes a class whose only tests come from a parent class from vendor', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        childLabels(
                            extension.controller.items,
                            'Only Inherits Vendor Base (Tests\\OnlyInheritsVendorBase)',
                        ),
                    ).toEqual([`${icon(TestType.method)} test_from_vendor_base`]);
                });

                it('ignores test classes in files without the default Test.php suffix', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        findItem(
                            extension.controller.items,
                            'Without Suffix Case (Tests\\WithoutSuffixCase)',
                        ),
                    ).toBeUndefined();
                    expect(
                        findItem(extension.controller.items, 'Assertions (Tests\\Assertions)'),
                    ).toBeDefined();
                });

                it('includes test methods of a trait loaded with require_once', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        childLabels(
                            extension.controller.items,
                            'Require Trait (Tests\\RequireTrait)',
                        ),
                    ).toEqual([
                        `${icon(TestType.method)} test_from_required_trait`,
                        `${icon(TestType.method)} test_own`,
                    ]);
                });

                it('resolves every test including data provider data sets', async () => {
                    const extension = await activateExtension(context);

                    const { controller } = extension;

                    await extension.resolve();

                    expect(countItems(controller.items)).toEqual(110);

                    const annotationMulti = findItem(
                        controller.items,
                        'Data Provider Annotation (Tests\\DataProviderAnnotation)::Multi provider',
                    );
                    expect(annotationMulti).toBeDefined();
                    const annotationChildIds: string[] = [];
                    for (const [id] of annotationMulti?.children ?? []) {
                        annotationChildIds.push(id);
                    }
                    expect(annotationChildIds).toEqual([
                        'Data Provider Annotation (Tests\\DataProviderAnnotation)::Multi provider with data set "one plus one"',
                        'Data Provider Annotation (Tests\\DataProviderAnnotation)::Multi provider with data set #0',
                    ]);

                    const attributeMulti = findItem(
                        controller.items,
                        'Data Provider Attribute (Tests\\DataProviderAttribute)::Multi provider',
                    );
                    expect(attributeMulti).toBeDefined();
                    const attributeChildIds: string[] = [];
                    for (const [id] of attributeMulti?.children ?? []) {
                        attributeChildIds.push(id);
                    }
                    expect(attributeChildIds).toEqual([
                        'Data Provider Attribute (Tests\\DataProviderAttribute)::Multi provider with data set "one plus one"',
                        'Data Provider Attribute (Tests\\DataProviderAttribute)::Multi provider with data set #0',
                    ]);

                    const forLoopProvider = findItem(
                        controller.items,
                        'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider',
                    );
                    expect(forLoopProvider).toBeDefined();
                    const forLoopChildIds: string[] = [];
                    for (const [id] of forLoopProvider?.children ?? []) {
                        forLoopChildIds.push(id);
                    }
                    expect(forLoopChildIds).toEqual([
                        'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 0"',
                        'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 1"',
                        'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 2"',
                    ]);

                    const foreachArrayProvider = findItem(
                        controller.items,
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider',
                    );
                    expect(foreachArrayProvider).toBeDefined();
                    const foreachArrayChildIds: string[] = [];
                    for (const [id] of foreachArrayProvider?.children ?? []) {
                        foreachArrayChildIds.push(id);
                    }
                    expect(foreachArrayChildIds).toEqual([
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "alpha"',
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "beta"',
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "gamma"',
                    ]);

                    const foreachConstProvider = findItem(
                        controller.items,
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider',
                    );
                    expect(foreachConstProvider).toBeDefined();
                    const foreachConstChildIds: string[] = [];
                    for (const [id] of foreachConstProvider?.children ?? []) {
                        foreachConstChildIds.push(id);
                    }
                    expect(foreachConstChildIds).toEqual([
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "alpha"',
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "beta"',
                        'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "gamma"',
                    ]);
                });

                it('resolves the tests of a folder without phpunit.xml', async () => {
                    const testsRoot = phpUnitFixture.testsFolder;
                    await openWorkspace({ root: testsRoot, settings: { args: [] } });

                    const extension = await activateExtension(context);

                    const { controller } = extension;

                    await extension.resolve();

                    expect(countItems(controller.items)).toEqual(117);
                });

                it('resolves the tests of the phpunit.xml.dist given with -c', async () => {
                    await workspace
                        .getConfiguration('phpunit', Uri.file(root))
                        .update('args', ['-c', phpUnitFixture.phpUnitXmlDist]);

                    const extension = await activateExtension(context);

                    const { controller } = extension;

                    await extension.resolve();

                    expect(countItems(controller.items)).toEqual(12);
                });

                it('refresh rebuilds the tree from the current settings', async () => {
                    const extension = await activateExtension(context);

                    const { controller } = extension;

                    await workspace
                        .getConfiguration('phpunit', Uri.file(root))
                        .update('args', ['-c', phpUnitFixture.phpUnitXmlDist]);
                    await extension.refresh();

                    expect(countItems(controller.items)).toEqual(12);
                });
            });

            describe('running tests', () => {
                it('runs all tests', async () => {
                    const extension = await activateAndRun();

                    const expected = byVersion(
                        phpUnitVersion,
                        [
                            [
                                '12.0.0',
                                { enqueued: 82, started: 67, passed: 50, failed: 15, end: 1 },
                            ],
                            [
                                '10.0.0',
                                { enqueued: 82, started: 81, passed: 67, failed: 12, end: 1 },
                            ],
                        ],
                        { enqueued: 82, started: 59, passed: 38, failed: 19, end: 1 },
                    );

                    expectTestResultCalled(extension, expected);
                });

                it('runs the tests of a namespace', async () => {
                    const extension = await activateAndRun({
                        include: phpUnitFixture.items.testsNamespace,
                    });

                    const expected = byVersion(
                        phpUnitVersion,
                        [
                            [
                                '12.0.0',
                                { enqueued: 81, started: 66, passed: 50, failed: 14, end: 1 },
                            ],
                            [
                                '10.0.0',
                                { enqueued: 81, started: 80, passed: 67, failed: 11, end: 1 },
                            ],
                        ],
                        { enqueued: 81, started: 58, passed: 38, failed: 18, end: 1 },
                    );

                    expectTestResultCalled(extension, expected);
                });

                it('runs the tests of a class', async () => {
                    const extension = await activateAndRun({
                        include: phpUnitFixture.items.assertions,
                    });

                    const expected = byVersion(
                        phpUnitVersion,
                        [
                            ['12.0.0', { enqueued: 12, started: 6, passed: 1, failed: 3, end: 1 }],
                            ['10.0.0', { enqueued: 12, started: 11, passed: 6, failed: 3, end: 1 }],
                        ],
                        { enqueued: 12, started: 12, passed: 7, failed: 3, end: 1 },
                    );

                    expectTestResultCalled(extension, expected);
                });

                it('runs a single test method and points its failure at the failing line', async () => {
                    const id = `Calculator (Tests\\Calculator)::Throw exception`;
                    const extension = await activateAndRun({ include: id });

                    expectTestResultCalled(extension, {
                        enqueued: 1,
                        started: 1,
                        passed: 0,
                        failed: 1,
                        end: 1,
                    });

                    const { failed } = extension.testRuns()[0];
                    const call = (failed as Mock).mock.calls.find(
                        ([test]: { id: string }[]) => test.id === id,
                    );
                    expect(call).toBeDefined();
                    const [, message] = call ?? [];

                    expect(message.location).toEqual(
                        expect.objectContaining({
                            range: {
                                start: expect.objectContaining({ line: 53, character: 0 }),
                                end: expect.objectContaining({ line: 53, character: 0 }),
                            },
                        }),
                    );
                });

                it('runs a single data set of a data provider', async () => {
                    const id = `Data Provider Attribute (Tests\\DataProviderAttribute)::Attribute provider with data set "two plus three"`;
                    await activateAndRun({ include: id });

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            /--filter=.*testAttributeProvider with data set "two plus three"/,
                            '--colors=always',
                            '--teamcity',
                            /DataProviderAttributeTest\.php/,
                        ],
                    });
                });
            });

            describe('commands', () => {
                it('phpunit.run-all runs all tests', async () => {
                    const _ext = await activateExtension(context);

                    await commands.executeCommand('phpunit.run-all');

                    expectSpawned({ cwd: root, args: [binary, '--colors=always', '--teamcity'] });
                });

                it('phpunit.run-file runs the file of the active editor', async () => {
                    setActiveTextEditor(phpUnitFixture.assertionsTest);
                    const _ext = await activateExtension(context);

                    await commands.executeCommand('phpunit.run-file');

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });

                it('phpunit.run-test-at-cursor runs the test method under the cursor', async () => {
                    const _ext = await activateExtension(context);
                    setActiveTextEditor(
                        phpUnitFixture.assertionsTest,
                        phpUnitFixture.cursorInTestPassed,
                    );

                    await commands.executeCommand('phpunit.run-test-at-cursor');

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            methodFilter('test_passed'),
                            Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });
            });

            describe('groups', () => {
                it('passes --group from the phpunit.args setting', async () => {
                    const configuration = workspace.getConfiguration('phpunit', Uri.file(root));
                    await configuration.update('args', ['--group=integration']);

                    await activateAndRun();

                    expectSpawned({
                        cwd: root,
                        args: [binary, '--group=integration', '--colors=always', '--teamcity'],
                    });

                    await configuration.update('args', []);
                });

                it('phpunit.run-by-group runs the group picked from the list', async () => {
                    const _ext = await activateExtension(context);
                    (window.showQuickPick as Mock).mockResolvedValue('integration');

                    await commands.executeCommand('phpunit.run-by-group');

                    expect(window.showQuickPick).toHaveBeenCalledWith(
                        expect.arrayContaining(['integration']),
                        expect.objectContaining({
                            placeHolder: 'Select a PHPUnit group to run',
                        }),
                    );

                    expectSpawned({ cwd: root, args: [binary, '--colors=always', '--teamcity'] });
                });

                it('runs a class with a group by that group', async () => {
                    await activateAndRun({ include: phpUnitFixture.items.attribute });

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            '--group=integration',
                            Uri.file(phpUnitProject('tests/AttributeTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });

                it('runs a method with a group by its name', async () => {
                    await activateAndRun({ include: phpUnitFixture.items.assertionsPassed });

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            methodFilter('test_passed'),
                            Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });

                it('runs the method with a group under the cursor by its name', async () => {
                    const _ext = await activateExtension(context);
                    setActiveTextEditor(
                        phpUnitFixture.assertionsTest,
                        phpUnitFixture.cursorInTestPassed,
                    );

                    await commands.executeCommand('phpunit.run-test-at-cursor');

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            methodFilter('test_passed'),
                            Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });
            });

            describe('rerun', () => {
                it('phpunit.rerun runs the previous request again', async () => {
                    const _ext = await activateExtension(context);
                    setActiveTextEditor(
                        phpUnitFixture.assertionsTest,
                        phpUnitFixture.cursorInTestPassed,
                    );

                    await commands.executeCommand('phpunit.run-test-at-cursor');

                    vi.mocked(spawn).mockClear();

                    await commands.executeCommand('phpunit.rerun');

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            methodFilter('test_passed'),
                            Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });

                it('a continuous run does not replace the request to rerun', async () => {
                    type FakeWatcher = {
                        fireChange: (uri: Uri) => void;
                        pattern: { pattern: string };
                    };
                    const watchers = (workspace as unknown as { createdWatchers: FakeWatcher[] })
                        .createdWatchers;
                    const extension = await activateExtension(context);
                    const { controller } = extension;
                    const before = watchers.length;
                    await extension.resolve();
                    const testWatchers = watchers
                        .slice(before)
                        .filter(({ pattern }) => !pattern.pattern.includes('.xml'));
                    setActiveTextEditor(
                        phpUnitFixture.assertionsTest,
                        phpUnitFixture.cursorInTestPassed,
                    );
                    await commands.executeCommand('phpunit.run-test-at-cursor');
                    const calculator = findItem(controller.items, phpUnitFixture.items.calculator);
                    await extension.run([calculator], { continuous: true });
                    vi.mocked(spawn).mockClear();
                    for (const watcher of testWatchers) {
                        watcher.fireChange(Uri.file(phpUnitFixture.calculatorTest));
                    }
                    await vi.waitFor(() => {
                        const testRuns = (controller.createTestRun as Mock).mock.results;
                        expect(testRuns).toHaveLength(2);
                        expect(testRuns[1].value.end).toHaveBeenCalled();
                    });

                    vi.mocked(spawn).mockClear();
                    await commands.executeCommand('phpunit.rerun');

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            methodFilter('test_passed'),
                            Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                            '--colors=always',
                            '--teamcity',
                        ],
                    });
                });

                it('phpunit.rerun keeps the coverage profile of the previous run', async () => {
                    vi.spyOn(CloverParser.prototype, 'parseClover').mockResolvedValue([]);

                    const extension = await activateExtension(context);
                    const { controller } = extension;
                    const include = [findItem(controller.items, phpUnitFixture.items.assertions)];
                    await extension.run(include, { kind: TestRunProfileKind.Coverage });

                    vi.mocked(spawn).mockClear();
                    await commands.executeCommand('phpunit.rerun');

                    expectSpawned({
                        cwd: root,
                        args: [
                            '-dxdebug.mode=coverage',
                            binary,
                            /AssertionsTest\.php/,
                            '--colors=always',
                            '--teamcity',
                            '--coverage-clover',
                            /\.phpunit\.cache[/\\]coverage-.+-0\.xml/,
                        ],
                        env: { XDEBUG_MODE: 'coverage' },
                    });
                });
            });

            describe('debugging', () => {
                it('debugs with Xdebug on a free port and stops the debug session afterwards', async () => {
                    await activateAndRun({ kind: TestRunProfileKind.Debug });

                    expectSpawned({
                        cwd: root,
                        args: [
                            '-dxdebug.mode=debug',
                            '-dxdebug.start_with_request=1',
                            /-dxdebug\.client_port=\d+/,
                            binary,
                            '--colors=always',
                            '--teamcity',
                        ],
                        env: { XDEBUG_MODE: 'debug' },
                    });

                    expect(debug.startDebugging).toHaveBeenCalledWith(expect.anything(), {
                        type: 'php',
                        request: 'launch',
                        name: 'PHPUnit',
                        port: expect.any(Number),
                    });
                    expect(debug.stopDebugging).toHaveBeenCalledWith({ type: 'php' });
                });

                it('uses the port of the launch configuration named by debuggerConfig', async () => {
                    const folderUri = Uri.file(root);
                    await workspace.getConfiguration('launch', folderUri).update('configurations', [
                        {
                            name: 'Listen for Xdebug',
                            type: 'php',
                            request: 'launch',
                            port: 9003,
                        },
                    ]);
                    const configuration = workspace.getConfiguration('phpunit', folderUri);
                    await configuration.update('debuggerConfig', 'Listen for Xdebug');

                    try {
                        await activateAndRun({ kind: TestRunProfileKind.Debug });

                        expectSpawned({
                            cwd: root,
                            args: [
                                '-dxdebug.mode=debug',
                                '-dxdebug.start_with_request=1',
                                '-dxdebug.client_port=9003',
                                binary,
                                '--colors=always',
                                '--teamcity',
                            ],
                            env: { XDEBUG_MODE: 'debug' },
                        });
                        expect(debug.startDebugging).toHaveBeenCalledWith(
                            expect.anything(),
                            'Listen for Xdebug',
                        );
                    } finally {
                        await configuration.update('debuggerConfig', undefined);
                    }
                });

                it('leaves the client port to Xdebug when the named launch configuration has none', async () => {
                    const folderUri = Uri.file(root);
                    await workspace
                        .getConfiguration('launch', folderUri)
                        .update('configurations', [
                            { name: 'Listen for Xdebug', type: 'php', request: 'launch' },
                        ]);
                    const configuration = workspace.getConfiguration('phpunit', folderUri);
                    await configuration.update('debuggerConfig', 'Listen for Xdebug');

                    try {
                        await activateAndRun({ kind: TestRunProfileKind.Debug });

                        const [, args] = (spawn as Mock).mock.calls[0];
                        expect(args).toEqual(
                            expect.arrayContaining([
                                '-dxdebug.mode=debug',
                                '-dxdebug.start_with_request=1',
                            ]),
                        );
                        expect(
                            args.filter((arg: string) => arg.startsWith('-dxdebug.client_port')),
                        ).toEqual([]);
                    } finally {
                        await configuration.update('debuggerConfig', undefined);
                    }
                });
            });

            describe('coverage', () => {
                it('collects the coverage of each process into the test run', async () => {
                    const fakeData: FileCoverageData[] = [
                        { filePath: join(root, 'src/Foo.php'), covered: 1, total: 2, lines: [] },
                    ];
                    const parseCloverSpy = vi
                        .spyOn(CloverParser.prototype, 'parseClover')
                        .mockResolvedValue(fakeData);

                    const extension = await activateExtension(context);
                    const { controller } = extension;
                    const include = [
                        phpUnitFixture.items.assertions,
                        phpUnitFixture.items.calculator,
                    ]
                        .map((id) => findItem(controller.items, id))
                        .filter((item): item is TestItem => item !== undefined);
                    const request = await extension.run(include, {
                        kind: TestRunProfileKind.Coverage,
                    });

                    ['AssertionsTest.php', 'CalculatorTest.php'].forEach((file, i) => {
                        expectSpawned({
                            cwd: root,
                            args: [
                                '-dxdebug.mode=coverage',
                                binary,
                                new RegExp(file),
                                '--colors=always',
                                '--teamcity',
                                '--coverage-clover',
                                new RegExp(`\\.phpunit\\.cache[/\\\\]coverage-.+-${i}\\.xml`),
                            ],
                            env: { XDEBUG_MODE: 'coverage' },
                        });
                    });

                    expect(parseCloverSpy).toHaveBeenCalledTimes(2);
                    expect(parseCloverSpy.mock.calls[0][0]).toMatch(
                        /\.phpunit\.cache[/\\]coverage-.+-0\.xml$/,
                    );
                    expect(parseCloverSpy.mock.calls[1][0]).toMatch(
                        /\.phpunit\.cache[/\\]coverage-.+-1\.xml$/,
                    );

                    const testRun = extension.testRuns()[0];
                    expect(testRun.addCoverage).toHaveBeenCalledTimes(2);

                    const createTestRunCalls = (controller.createTestRun as Mock).mock.calls;
                    expect(createTestRunCalls.length).toBeGreaterThan(0);
                    for (const [calledRequest] of createTestRunCalls) {
                        expect(calledRequest).toBe(request);
                    }
                });
            });

            describe('settings', () => {
                it('reloads the configuration only when a phpunit setting changes', async () => {
                    const _ext = await activateExtension(context);

                    const onDidChangeConfig = workspace.onDidChangeConfiguration as Mock;
                    const listenerCall = onDidChangeConfig.mock.calls.find(
                        (call: unknown[]) => typeof call[0] === 'function',
                    );
                    expect(listenerCall).toBeDefined();
                    const listener = listenerCall?.[0];

                    const spy = vi.spyOn(Configuration.prototype, 'updateWorkspaceConfiguration');

                    listener({ affectsConfiguration: (section: string) => section === 'phpunit' });
                    expect(spy).toHaveBeenCalledTimes(1);

                    spy.mockClear();

                    listener({ affectsConfiguration: (section: string) => section === 'editor' });
                    expect(spy).not.toHaveBeenCalled();

                    spy.mockRestore();
                });
            });
        },
    );

    describe.each(stubs.paratest)('Paratest $name', ({ root, binary, args }) => {
        beforeEach(async () => {
            await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
            window.showErrorMessage = vi.fn();
        });

        afterEach(() => vi.clearAllMocks());

        it('runs the test method under the cursor with --functional', async () => {
            const extension = await activateExtension(context);
            setActiveTextEditor(phpUnitFixture.assertionsTest, phpUnitFixture.cursorInTestPassed);

            await commands.executeCommand('phpunit.run-test-at-cursor');

            const method = 'test_passed';

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    methodFilter(method),
                    Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                    '--functional',
                ],
            });

            expect(window.showErrorMessage).not.toHaveBeenCalled();

            expectTestResultCalled(extension, {
                enqueued: 1,
                started: 1,
                passed: 1,
                failed: 0,
                end: 1,
            });
        });
    });

    describe('multi-root workspace (PHPUnit + Pest)', {
        skip: stubs.phpUnit.length === 0 || stubs.pest.length === 0,
    }, () => {
        const [phpUnitStub] = stubs.phpUnit;
        const [pestStub] = stubs.pest;

        beforeEach(async () => {
            await openWorkspace(
                {
                    root: phpUnitStub.root,
                    name: 'phpunit-stub',
                    settings: phpUnitSettings(phpUnitStub.binary, phpUnitStub.args),
                },
                {
                    root: pestStub.root,
                    name: 'pest-stub',
                    settings: phpUnitSettings(pestStub.binary, pestStub.args),
                },
            );
        });
        afterEach(() => vi.clearAllMocks());

        it('lists the tests of each folder under its folder item', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;

            const phpUnitFolder = findItem(
                controller.items,
                `folder:${Uri.file(phpUnitStub.root).toString()}`,
            );
            const pestFolder = findItem(
                controller.items,
                `folder:${Uri.file(pestStub.root).toString()}`,
            );
            expect(phpUnitFolder).toBeDefined();
            expect(phpUnitFolder?.label).toBe(`${icon(TestType.workspace)} phpunit-stub`);
            expect(pestFolder).toBeDefined();
            expect(pestFolder?.label).toBe(`${icon(TestType.workspace)} pest-stub`);

            if (!phpUnitFolder || !pestFolder) throw new Error('folder item not found');

            const phpUnitItem = findItem(phpUnitFolder.children, 'Assertions (Tests\\Assertions)');
            expect(phpUnitItem).toBeDefined();
            expect(phpUnitItem?.label).toContain('AssertionsTest');

            const pestUnitSuite = findItem(pestFolder.children, 'testsuite:Unit');
            expect(pestUnitSuite).toBeDefined();
            expect(pestUnitSuite?.label).toContain('Unit');

            const pestItem = pestUnitSuite
                ? findItem(pestUnitSuite.children, 'tests/Unit/ExampleTest.php::test_description')
                : undefined;
            expect(pestItem).toBeDefined();
            expect(pestItem?.label).toContain('test_description');
        });

        it('runs a PHPUnit test in its own folder', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const phpUnitFolder = findItem(
                controller.items,
                `folder:${Uri.file(phpUnitStub.root).toString()}`,
            );
            if (!phpUnitFolder) throw new Error('phpUnitFolder item not found');
            const testItem = findItem(phpUnitFolder.children, 'Assertions (Tests\\Assertions)');
            expect(testItem).toBeDefined();
            await extension.run([testItem]);

            expectSpawned({
                cwd: phpUnitStub.root,
                args: [phpUnitStub.binary, '--colors=always', '--teamcity'],
            });
        });

        it('runs a Pest test in its own folder', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const pestFolder = findItem(
                controller.items,
                `folder:${Uri.file(pestStub.root).toString()}`,
            );
            if (!pestFolder) throw new Error('pestFolder item not found');
            const pestUnitSuite = findItem(pestFolder.children, 'testsuite:Unit');
            if (!pestUnitSuite) throw new Error('pestUnitSuite item not found');
            const testItem = findItem(
                pestUnitSuite.children,
                'tests/Unit/ExampleTest.php::test_description',
            );
            expect(testItem).toBeDefined();
            await extension.run([testItem]);

            expectSpawned({
                cwd: pestStub.root,
                args: [pestStub.binary, '--colors=always', '--teamcity'],
            });
        });

        it('phpunit.rerun runs the tests of every folder of the previous run', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const phpUnitFolder = findItem(
                controller.items,
                `folder:${Uri.file(phpUnitStub.root).toString()}`,
            );
            const pestFolder = findItem(
                controller.items,
                `folder:${Uri.file(pestStub.root).toString()}`,
            );
            if (!phpUnitFolder || !pestFolder) throw new Error('folder item not found');
            const include = [
                findItem(phpUnitFolder.children, 'Assertions (Tests\\Assertions)'),
                findItem(pestFolder.children, 'testsuite:Unit'),
            ];
            await extension.run(include);

            vi.mocked(spawn).mockClear();
            await commands.executeCommand('phpunit.rerun');

            expect(spawn).toHaveBeenCalledTimes(2);
        });

        it('runs a Pest testsuite with --testsuite', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const pestFolder = findItem(
                controller.items,
                `folder:${Uri.file(pestStub.root).toString()}`,
            );
            if (!pestFolder) throw new Error('pestFolder item not found');
            const testItem = findItem(pestFolder.children, 'testsuite:Unit');
            expect(testItem).toBeDefined();
            await extension.run([testItem]);

            expectSpawned({
                cwd: pestStub.root,
                args: [pestStub.binary, '--testsuite=Unit', '--colors=always', '--teamcity'],
            });
        });

        it('running the PHPUnit folder item runs all of its tests in one process', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const phpUnitFolder = findItem(
                controller.items,
                `folder:${Uri.file(phpUnitStub.root).toString()}`,
            );
            expect(phpUnitFolder).toBeDefined();
            if (!phpUnitFolder) throw new Error('phpUnitFolder item not found');
            await extension.run([phpUnitFolder]);

            expectSpawned({
                cwd: phpUnitStub.root,
                args: [phpUnitStub.binary, '--colors=always', '--teamcity'],
            });
            expect(spawn).toHaveBeenCalledTimes(1);
        });

        it('running the Pest folder item runs all of its tests in one process', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const pestFolder = findItem(
                controller.items,
                `folder:${Uri.file(pestStub.root).toString()}`,
            );
            expect(pestFolder).toBeDefined();
            if (!pestFolder) throw new Error('pestFolder item not found');
            await extension.run([pestFolder]);

            expectSpawned({
                cwd: pestStub.root,
                args: [pestStub.binary, '--colors=always', '--teamcity'],
            });
            expect(spawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('workspace folder lifecycle', {
        skip: stubs.phpUnit.length === 0,
    }, () => {
        const [phpUnitStub] = stubs.phpUnit;
        const [pestStub] = stubs.pest;

        beforeEach(async () => {
            const { root, binary, args } = phpUnitStub;
            await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
        });
        afterEach(() => vi.clearAllMocks());

        const findFolderManager = () => {
            const pushMock = context.subscriptions.push as unknown as Mock;
            for (const call of pushMock.mock.calls) {
                for (const arg of call) {
                    if (
                        arg &&
                        typeof arg === 'object' &&
                        typeof arg.dispose === 'function' &&
                        typeof arg[Symbol.iterator] === 'function'
                    ) {
                        return arg;
                    }
                }
            }
            return undefined;
        };

        it('disposing the folder manager clears the test tree', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            await extension.resolve();

            expect(controller.items.size).toBeGreaterThan(0);

            const folderManager = findFolderManager();
            expect(folderManager).toBeDefined();
            folderManager.dispose();

            expect(controller.items.size).toBe(0);
        });

        it('resolving again disposes the previous file watchers', async () => {
            const extension = await activateExtension(context);

            await extension.resolve();

            const firstWatchers = (workspace.createFileSystemWatcher as Mock).mock.results.map(
                (r) => r.value as FakeFileSystemWatcher,
            );

            await extension.resolve();

            for (const watcher of firstWatchers) {
                expect(watcher.disposed).toBe(true);
            }
        });

        it.skipIf(stubs.pest.length === 0)('handles folder changes one at a time', async () => {
            const phpUnitFolder: WorkspaceFolder = {
                index: 0,
                name: 'phpunit-stub',
                uri: Uri.file(phpUnitStub.root),
            };

            await openWorkspace({
                root: phpUnitStub.root,
                name: phpUnitFolder.name,
                settings: phpUnitSettings(phpUnitStub.binary, phpUnitStub.args),
            });
            const _ext = await activateExtension(context);

            const pestFolder: WorkspaceFolder = {
                index: 1,
                name: 'pest-stub',
                uri: Uri.file(pestStub.root),
            };
            const pestConfig = workspace.getConfiguration('phpunit', pestFolder.uri);
            await pestConfig.update('php', 'php');
            await pestConfig.update('phpunit', pestStub.binary);
            await pestConfig.update('args', pestStub.args);

            const onFolderChange = workspace.onDidChangeWorkspaceFolders as Mock;
            const listenerCall = onFolderChange.mock.calls.find(
                (call: unknown[]) => typeof call[0] === 'function',
            );
            expect(listenerCall).toBeDefined();

            (
                workspace.findFiles as unknown as {
                    _maxConcurrent: number;
                    _concurrentCount: number;
                }
            )._maxConcurrent = 0;
            (
                workspace.findFiles as unknown as {
                    _maxConcurrent: number;
                    _concurrentCount: number;
                }
            )._concurrentCount = 0;

            await changeWorkspaceFolders({ added: [pestFolder] });

            await changeWorkspaceFolders({ removed: [pestFolder] });

            await commands.executeCommand('phpunit.reload');

            expect(
                (workspace.findFiles as unknown as { _maxConcurrent: number })._maxConcurrent,
            ).toBeLessThanOrEqual(2);
        });

        it('resolving creates file system watchers', async () => {
            const extension = await activateExtension(context);

            (workspace.findFiles as Mock).mockClear();

            await extension.resolve();

            expect(workspace.createFileSystemWatcher).toHaveBeenCalled();
        });

        it('refresh restores every item', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            await extension.resolve();

            const itemsBefore = controller.items.size;
            expect(itemsBefore).toBeGreaterThan(0);

            await extension.refresh();

            expect(controller.items.size).toBe(itemsBefore);
        });

        it('concurrent resolves leave a single set of watchers', async () => {
            const extension = await activateExtension(context);

            await extension.resolve();

            const p1 = extension.resolve();
            const p2 = extension.resolve();
            await Promise.all([p1, p2]);

            const allWatchers = (workspace.createFileSystemWatcher as Mock).mock.results.map(
                (r) => r.value as FakeFileSystemWatcher,
            );

            const undisposed = allWatchers.filter((w) => !w.disposed);
            expect(undisposed.length).toBe(2);
        });
    });

    describe.each(stubs.pest)(
        'Pest $name ($pestVersion)',
        ({ root, pestVersion, binary, args }) => {
            beforeEach(() => openWorkspace({ root, settings: phpUnitSettings(binary, args) }));
            afterEach(() => vi.clearAllMocks());

            describe('test discovery', () => {
                it('includes test methods of a trait whose file does not match the testsuite suffix', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        childLabels(
                            extension.controller.items,
                            'Shared Trait User (Tests\\Unit\\SharedTraitUser)',
                        ),
                    ).toEqual([
                        `${icon(TestType.method)} test_from_shared_trait`,
                        `${icon(TestType.method)} test_own`,
                    ]);
                });

                it('includes test methods inherited from a class outside the testsuite directories through composer autoload', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();

                    expect(
                        childLabels(
                            extension.controller.items,
                            'Inherits Support Base (Tests\\Unit\\InheritsSupportBase)',
                        ),
                    ).toEqual([
                        `${icon(TestType.method)} test_from_support_base`,
                        `${icon(TestType.method)} test_own`,
                    ]);
                });

                it('watches composer autoload-dev files outside the testsuite directories', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();
                    const supportFile = join(root, 'tests/Support/AbstractSharedTestCase.php');

                    const watched = (workspace.createFileSystemWatcher as Mock).mock.results.some(
                        ({ value }) => {
                            const { base, pattern } = value.pattern as {
                                base: string;
                                pattern: string;
                            };
                            return minimatch(
                                relative(base, supportFile).split(sep).join('/'),
                                pattern,
                            );
                        },
                    );

                    expect(watched).toBe(true);
                });

                it('watches composer.json to reload when the autoload mapping changes', async () => {
                    const extension = await activateExtension(context);
                    await extension.resolve();
                    const composerJson = join(root, 'composer.json');

                    const watched = (workspace.createFileSystemWatcher as Mock).mock.results.some(
                        ({ value }) => {
                            const { base, pattern } = value.pattern as {
                                base: string;
                                pattern: string;
                            };
                            return minimatch(
                                relative(base, composerJson).split(sep).join('/'),
                                pattern,
                            );
                        },
                    );

                    expect(watched).toBe(true);
                });
            });

            describe('running tests', () => {
                it('runs all tests', async () => {
                    const extension = await activateAndRun();

                    const expected = byVersion(
                        pestVersion,
                        [['3.0.0', { enqueued: 93, started: 93, passed: 86, failed: 4, end: 1 }]],
                        { enqueued: 93, started: 86, passed: 82, failed: 0, end: 1 },
                    );

                    expectTestResultCalled(extension, expected);
                });

                it('runs a single test', async () => {
                    const id = `tests/Unit/ExampleTest.php::test_description`;
                    const extension = await activateAndRun({ include: id });

                    expectTestResultCalled(extension, {
                        enqueued: 1,
                        started: 1,
                        passed: 1,
                        failed: 0,
                        end: 1,
                    });
                });

                it('runs every data set of a test with a dataset', async () => {
                    const id = `tests/Unit/ExampleTest.php::it has user's email`;
                    const extension = await activateAndRun({ include: id });

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            methodFilter(`it has user\\'s email`),
                            '--colors=always',
                            '--teamcity',
                        ],
                    });

                    const expected = byVersion(
                        pestVersion,
                        [['3.0.0', { enqueued: 3, started: 3, passed: 3, failed: 0, end: 1 }]],
                        { enqueued: 3, started: 2, passed: 2, failed: 0, end: 1 },
                    );

                    expectTestResultCalled(extension, expected);
                });

                it('runs a single data set by its exact description', async () => {
                    const id = `tests/Unit/ExampleTest.php::it has user's email with data set "('enunomaduro@gmail.com')"`;
                    await activateAndRun({ include: id });

                    expectSpawned({
                        cwd: root,
                        args: [
                            binary,
                            `--filter=/^.*::(it has user\\'s email with data set "\\(\\'enunomaduro@gmail\\.com\\'\\)")$/`,
                            '--colors=always',
                            '--teamcity',
                            /ExampleTest\.php/,
                        ],
                    });
                });
            });

            describe('groups', () => {
                it('passes --group from the phpunit.args setting', async () => {
                    const configuration = workspace.getConfiguration('phpunit', Uri.file(root));
                    await configuration.update('args', ['--group=integration']);

                    await activateAndRun();

                    expectSpawned({
                        cwd: root,
                        args: [binary, '--group=integration', '--colors=always', '--teamcity'],
                    });

                    await configuration.update('args', []);
                });
            });
        },
    );
});
