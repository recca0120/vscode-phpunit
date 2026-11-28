import 'reflect-metadata';
import { initTreeSitter, PHPUnitXML } from '@vscode-phpunit/phpunit';
import {
    type CancellationToken,
    commands,
    type Disposable,
    type ExtensionContext,
    extensions,
    languages,
    type OutputChannel,
    type TestController,
    TestRunProfileKind,
    type TestRunRequest,
    tests,
    type WorkspaceFolder,
    window,
    workspace,
} from 'vscode';
import { PHPUnitLinkProvider, TestCommandRegistry } from './Commands';
import { Configuration } from './Configuration';
import { createParentContainer } from './container';
import { TestFileWatcher } from './TestDiscovery';
import { TestRunDispatcher } from './TestExecution';
import { FileCoverageAdapter } from './TestExecution/FileCoverageAdapter';
import { TestTree } from './TestTree';
import { TYPES } from './types';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

export async function activate(context: ExtensionContext) {
    initTreeSitter().catch(() => {
        // tree-sitter init failed; TestParser will use php-parser fallback
    });

    const ctrl = tests.createTestController('phpunit', 'PHPUnit');
    const outputChannel = window.createOutputChannel('PHPUnit Debug', 'phpunit');
    const parentContainer = createParentContainer(ctrl, outputChannel);
    const folderManager = parentContainer.get(WorkspaceFolderManager);

    await folderManager.initialize();

    setupControllerHandlers(ctrl, folderManager, context);

    await addOpenDocuments(folderManager);
    registerDocumentListeners(context, folderManager);

    context.subscriptions.push(folderManager.registerFolderChangeListener());

    const dispatcher = parentContainer.get(TestRunDispatcher);
    const testRunProfile = createRunProfiles(ctrl, dispatcher);

    const testCommandRegistry = new TestCommandRegistry(folderManager, testRunProfile);
    registerCommands(context, testCommandRegistry);

    registerDisposables(context, ctrl, outputChannel, folderManager);

    return {
        testController: ctrl,
        testRunProfile,
        onDidReload: folderManager.onDidReload,
    };
}

function setupControllerHandlers(
    ctrl: TestController,
    folderManager: WorkspaceFolderManager,
    context: ExtensionContext,
): void {
    let activeWatchers: Disposable[] = [];

    ctrl.refreshHandler = () => folderManager.reloadAll();

    ctrl.resolveHandler = async (item) => {
        if (!item) {
            await folderManager.enqueue(async () => {
                for (const watcher of activeWatchers) {
                    watcher.dispose();
                }
                activeWatchers = [];

                await folderManager.reload();

                const watchers = await Promise.all(
                    folderManager.getAll().map((c) => c.get(TestFileWatcher).startWatching()),
                );
                activeWatchers = watchers;
                context.subscriptions.push(...watchers);
            });
            return;
        }

        if (item.uri) {
            const container = folderManager.getByUri(item.uri);
            if (container) {
                await container.get(TestTree).add(item.uri);
            }
        }
    };

    context.subscriptions.push({
        dispose: () => {
            for (const watcher of activeWatchers) {
                watcher.dispose();
            }
            activeWatchers = [];
        },
    });
}

async function addOpenDocuments(folderManager: WorkspaceFolderManager): Promise<void> {
    await Promise.all(
        workspace.textDocuments.flatMap((document) => {
            const container = folderManager.getByUri(document.uri);
            return container ? [container.get(TestTree).add(document.uri)] : [];
        }),
    );
}

const TYPING_PAUSE_MS = 300;

function registerDocumentListeners(
    context: ExtensionContext,
    folderManager: WorkspaceFolderManager,
): void {
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    context.subscriptions.push(
        workspace.onDidOpenTextDocument((document) => {
            const container = folderManager.getByUri(document.uri);
            if (container) {
                container.get(TestTree).add(document.uri);
            }
        }),
        workspace.onDidChangeTextDocument((e) => {
            if (e.contentChanges.length === 0) {
                return;
            }
            const { uri } = e.document;
            clearTimeout(typingTimers.get(uri.toString()));
            typingTimers.set(
                uri.toString(),
                setTimeout(() => {
                    typingTimers.delete(uri.toString());
                    folderManager.getByUri(uri)?.get(TestTree).update(uri);
                }, TYPING_PAUSE_MS),
            );
        }),
        { dispose: () => typingTimers.forEach(clearTimeout) },
    );
}

function createRunProfiles(ctrl: TestController, dispatcher: TestRunDispatcher) {
    const runHandler = async (request: TestRunRequest, cancellation: CancellationToken) => {
        if (!request.continuous && workspace.getConfiguration('phpunit').get('saveBeforeTest')) {
            await workspace.saveAll(false);
        }
        await dispatcher.dispatch(request, cancellation);
    };

    const testRunProfile = ctrl.createRunProfile(
        'Run Tests',
        TestRunProfileKind.Run,
        runHandler,
        true,
        undefined,
        true,
    );

    const profiles = [testRunProfile];

    if (extensions.getExtension('xdebug.php-debug') !== undefined) {
        profiles.push(
            ctrl.createRunProfile(
                'Debug Tests',
                TestRunProfileKind.Debug,
                runHandler,
                true,
                undefined,
                false,
            ),
        );
    }

    const coverageProfile = ctrl.createRunProfile(
        'Run with Coverage',
        TestRunProfileKind.Coverage,
        runHandler,
        true,
        undefined,
        false,
    );
    profiles.push(coverageProfile);
    for (const profile of profiles) {
        profile.configureHandler = () =>
            commands.executeCommand(
                'workbench.action.openSettings',
                '@ext:recca0120.vscode-phpunit',
            );
    }

    coverageProfile.loadDetailedCoverage = async (_testRun, coverage) => {
        if (coverage instanceof FileCoverageAdapter) {
            return coverage.generateDetailedCoverage();
        }
        return [];
    };

    return testRunProfile;
}

function registerCommands(context: ExtensionContext, testCommandRegistry: TestCommandRegistry) {
    context.subscriptions.push(
        testCommandRegistry.reload(),
        testCommandRegistry.runAll(),
        testCommandRegistry.runFile(),
        testCommandRegistry.runTestAtCursor(),
        testCommandRegistry.runByGroup(),
        testCommandRegistry.rerun(),
    );
}

function registerDisposables(
    context: ExtensionContext,
    ctrl: TestController,
    outputChannel: OutputChannel,
    folderManager: WorkspaceFolderManager,
) {
    const linkProvider = new PHPUnitLinkProvider(() =>
        folderManager.getAll().map((c) => c.get(PHPUnitXML)),
    );

    context.subscriptions.push(
        ctrl,
        outputChannel,
        folderManager,
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('phpunit')) {
                for (const child of folderManager) {
                    const folder = child.get<WorkspaceFolder>(TYPES.WorkspaceFolder);
                    child
                        .get(Configuration)
                        .updateWorkspaceConfiguration(
                            workspace.getConfiguration('phpunit', folder.uri),
                        );
                }
            }
        }),
        languages.registerDocumentLinkProvider({ language: 'phpunit' }, linkProvider),
    );
}
