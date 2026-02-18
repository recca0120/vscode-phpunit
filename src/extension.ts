import 'reflect-metadata';
import {
    type CancellationToken,
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
import { PHPUnitFileCoverage } from './Coverage';
import { createParentContainer } from './container';
import { PHPUnitXML } from './PHPUnit';
import { initTreeSitter } from './PHPUnit/TestParser/tree-sitter/TreeSitterParser';
import { TestCollection } from './TestCollection';
import { TestFileWatcher } from './TestDiscovery';
import { TestRunDispatcher } from './TestExecution';
import { TYPES } from './types';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

export async function activate(context: ExtensionContext) {
    // Initialize tree-sitter WASM (non-blocking, fallback to php-parser if it fails)
    // At runtime, __dirname is the dist/ folder where WASM files are copied by esbuild
    initTreeSitter().catch(() => {
        // tree-sitter init failed; TestParser will use php-parser fallback
    });

    const ctrl = tests.createTestController('phpunit', 'PHPUnit');
    const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
    const parentContainer = createParentContainer(ctrl, outputChannel);
    const folderManager = parentContainer.get(WorkspaceFolderManager);

    // Initialize folders, load config, apply roots, setup file change listeners
    await folderManager.initialize();

    // Test controller handlers
    setupControllerHandlers(ctrl, folderManager, context);

    // Add open documents and register document listeners
    await addOpenDocuments(folderManager);
    registerDocumentListeners(context, folderManager);

    // Folder change listener
    context.subscriptions.push(folderManager.registerFolderChangeListener());

    // Run profiles with multi-folder dispatch
    const dispatcher = parentContainer.get(TestRunDispatcher);
    const testRunProfile = createRunProfiles(ctrl, dispatcher);

    // Commands
    const testCommandRegistry = new TestCommandRegistry(folderManager, testRunProfile);
    registerCommands(context, testCommandRegistry);

    // Disposables
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
                await container.get(TestCollection).add(item.uri);
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
            return container ? [container.get(TestCollection).add(document.uri)] : [];
        }),
    );
}

function registerDocumentListeners(
    context: ExtensionContext,
    folderManager: WorkspaceFolderManager,
): void {
    context.subscriptions.push(
        workspace.onDidOpenTextDocument((document) => {
            const container = folderManager.getByUri(document.uri);
            if (container) {
                container.get(TestCollection).add(document.uri);
            }
        }),
        workspace.onDidChangeTextDocument((e) => {
            const container = folderManager.getByUri(e.document.uri);
            if (container) {
                container.get(TestCollection).change(e.document.uri);
            }
        }),
    );
}

function createRunProfiles(ctrl: TestController, dispatcher: TestRunDispatcher) {
    const runHandler = (request: TestRunRequest, cancellation: CancellationToken) =>
        dispatcher.dispatch(request, cancellation);

    const testRunProfile = ctrl.createRunProfile(
        'Run Tests',
        TestRunProfileKind.Run,
        runHandler,
        true,
        undefined,
        true,
    );

    if (extensions.getExtension('xdebug.php-debug') !== undefined) {
        ctrl.createRunProfile(
            'Debug Tests',
            TestRunProfileKind.Debug,
            runHandler,
            true,
            undefined,
            false,
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
    coverageProfile.loadDetailedCoverage = async (_testRun, coverage) => {
        if (coverage instanceof PHPUnitFileCoverage) {
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
