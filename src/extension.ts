import 'reflect-metadata';
import {
    EventEmitter, ExtensionContext, extensions, languages,
    TestRunProfileKind, tests, Uri, window, workspace,
} from 'vscode';
import { PHPUnitFileCoverage } from './CloverParser';
import { Configuration } from './Configuration';
import { TestWatchManager } from './TestWatchManager';
import { createContainer } from './container';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { TestCommandRegistry } from './TestCommandRegistry';
import { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';
import { TYPES } from './types';

export async function activate(context: ExtensionContext) {
    const ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
    const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
    const container = createContainer(ctrl, outputChannel);

    const configuration = container.get<Configuration>(TYPES.configuration);
    const fileChangedEmitter = container.get<EventEmitter<Uri>>(TYPES.fileChangedEmitter);
    const testFileDiscovery = container.get<TestFileDiscovery>(TYPES.testFileDiscovery);
    const testFileWatcher = container.get<TestFileWatcher>(TYPES.testFileWatcher);
    const testWatchManager = container.get<TestWatchManager>(TYPES.testWatchManager);
    const testCollection = container.get<TestCollection>(TYPES.testCollection);
    const testCommandRegistry = container.get<TestCommandRegistry>(TYPES.testCommandRegistry);

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

    // Run profiles
    const runHandler = testWatchManager.createRunHandler();
    const testRunProfile = ctrl.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true, undefined, true);

    if (extensions.getExtension('xdebug.php-debug') !== undefined) {
        ctrl.createRunProfile('Debug Tests', TestRunProfileKind.Debug, runHandler, true, undefined, false);
    }

    const coverageProfile = ctrl.createRunProfile('Run with Coverage', TestRunProfileKind.Coverage, runHandler, true, undefined, false);
    coverageProfile.loadDetailedCoverage = async (_testRun, coverage) => {
        return (<PHPUnitFileCoverage>coverage).generateDetailedCoverage();
    };

    // Commands
    testCommandRegistry.setTestRunProfile(testRunProfile);
    context.subscriptions.push(testCommandRegistry.reload());
    context.subscriptions.push(testCommandRegistry.runAll());
    context.subscriptions.push(testCommandRegistry.runFile());
    context.subscriptions.push(testCommandRegistry.runTestAtCursor());
    context.subscriptions.push(testCommandRegistry.rerun());

    context.subscriptions.push(commandHandler.runByGroup(handler));

    // Disposables
    context.subscriptions.push(
        ctrl,
        outputChannel,
        fileChangedEmitter,
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('phpunit')) {
                configuration.updateWorkspaceConfiguration(
                    workspace.getConfiguration('phpunit'),
                );
            }
        }),
        languages.registerDocumentLinkProvider(
            { language: 'phpunit' },
            container.get<PHPUnitLinkProvider>(TYPES.phpUnitLinkProvider),
        ),
    );
}
