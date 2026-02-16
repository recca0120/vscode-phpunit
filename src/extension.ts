import 'reflect-metadata';
import {
    type CancellationToken,
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
import { TestRunDispatcher } from './TestExecution';
import { TYPES } from './types';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

export async function activate(context: ExtensionContext) {
    const ctrl = tests.createTestController('phpunit', 'PHPUnit');
    const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
    const parentContainer = createParentContainer(ctrl, outputChannel);
    const folderManager = parentContainer.get(WorkspaceFolderManager);

    // Initialize folders, load config, apply roots, add documents, register listeners
    await folderManager.initialize(context);

    // Test controller handlers
    folderManager.setupControllerHandlers(context);

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
