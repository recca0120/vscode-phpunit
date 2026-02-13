import 'reflect-metadata';
import type { Container } from 'inversify';
import {
    type EventEmitter,
    type ExtensionContext,
    extensions,
    languages,
    type OutputChannel,
    type TestController,
    type TestRunProfile,
    TestRunProfileKind,
    tests,
    type Uri,
    window,
    workspace,
} from 'vscode';
import { PHPUnitLinkProvider, TestCommandRegistry } from './Commands';
import { Configuration } from './Configuration';
import type { PHPUnitFileCoverage } from './Coverage';
import { createContainer } from './container';
import { TestCollection } from './TestCollection';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import { TYPES } from './types';

export async function activate(context: ExtensionContext) {
    const ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
    const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
    const container = createContainer(ctrl, outputChannel);

    const testFileDiscovery = container.get(TestFileDiscovery);
    const testFileWatcher = container.get(TestFileWatcher);
    const testWatchManager = container.get(TestWatchManager);
    const testCollection = container.get(TestCollection);
    const testCommandRegistry = container.get(TestCommandRegistry);

    // Initial load
    await testFileDiscovery.loadWorkspaceConfiguration();
    await Promise.all(workspace.textDocuments.map((document) => testCollection.add(document.uri)));

    // Listeners
    testFileWatcher.registerDocumentListeners(context);
    testWatchManager.setupFileChangeListener();

    // Test controller
    ctrl.refreshHandler = () => testFileDiscovery.reloadAll();
    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...(await testFileWatcher.startWatching()));
            return;
        }

        if (item.uri) {
            await testCollection.add(item.uri);
        }
    };

    // Run profiles, commands, and disposables
    const testRunProfile = createRunProfiles(ctrl, testWatchManager);
    registerCommands(context, testCommandRegistry, testRunProfile);
    registerDisposables(context, ctrl, outputChannel, container);
}

function createRunProfiles(ctrl: TestController, testWatchManager: TestWatchManager) {
    const runHandler = testWatchManager.createRunHandler();

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
        return (<PHPUnitFileCoverage>coverage).generateDetailedCoverage();
    };

    return testRunProfile;
}

function registerCommands(
    context: ExtensionContext,
    testCommandRegistry: TestCommandRegistry,
    testRunProfile: TestRunProfile,
) {
    testCommandRegistry.setTestRunProfile(testRunProfile);
    context.subscriptions.push(testCommandRegistry.reload());
    context.subscriptions.push(testCommandRegistry.runAll());
    context.subscriptions.push(testCommandRegistry.runFile());
    context.subscriptions.push(testCommandRegistry.runTestAtCursor());
    context.subscriptions.push(testCommandRegistry.rerun());
    context.subscriptions.push(testCommandRegistry.runByGroup());
}

function registerDisposables(
    context: ExtensionContext,
    ctrl: TestController,
    outputChannel: OutputChannel,
    container: Container,
) {
    const configuration = container.get(Configuration);
    const fileChangedEmitter = container.get<EventEmitter<Uri>>(TYPES.FileChangedEmitter);

    context.subscriptions.push(
        ctrl,
        outputChannel,
        fileChangedEmitter,
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('phpunit')) {
                configuration.updateWorkspaceConfiguration(workspace.getConfiguration('phpunit'));
            }
        }),
        languages.registerDocumentLinkProvider(
            { language: 'phpunit' },
            container.get(PHPUnitLinkProvider),
        ),
    );
}
