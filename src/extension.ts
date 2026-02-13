import 'reflect-metadata';
import {
    CancellationToken, EventEmitter, ExtensionContext, extensions, languages,
    TestRunProfile, TestRunProfileKind, TestRunRequest, tests, Uri, window, workspace,
} from 'vscode';
import { Container } from 'inversify';
import { PHPUnitFileCoverage } from './CloverParser';
import { Configuration } from './Configuration';
import { ContinuousTestRunner } from './ContinuousTestRunner';
import { createContainer } from './container';
import { Handler } from './Handler';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { TestCommandRegistry } from './TestCommandRegistry';
import { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';
import { TYPES } from './types';

class PHPUnitExtension {
    private container!: Container;
    private ctrl!: ReturnType<typeof tests.createTestController>;

    async activate(context: ExtensionContext) {
        this.ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        context.subscriptions.push(this.ctrl);

        const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
        context.subscriptions.push(outputChannel);

        this.container = createContainer(this.ctrl, outputChannel);

        const fileChangedEmitter = this.container.get<EventEmitter<Uri>>(TYPES.fileChangedEmitter);
        context.subscriptions.push(fileChangedEmitter);

        const configuration = this.container.get<Configuration>(TYPES.configuration);
        context.subscriptions.push(
            workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('phpunit')) {
                    configuration.updateWorkspaceConfiguration(
                        workspace.getConfiguration('phpunit'),
                    );
                }
            }),
        );

        context.subscriptions.push(languages.registerDocumentLinkProvider(
            { language: 'phpunit' },
            this.container.get<PHPUnitLinkProvider>(TYPES.phpUnitLinkProvider),
        ));

        const testFileDiscovery = this.container.get<TestFileDiscovery>(TYPES.testFileDiscovery);
        const testFileWatcher = this.container.get<TestFileWatcher>(TYPES.testFileWatcher);
        const continuousTestRunner = this.container.get<ContinuousTestRunner>(TYPES.continuousTestRunner);
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);

        await testFileDiscovery.loadInitialConfiguration();
        await Promise.all(workspace.textDocuments.map((document) => testCollection.add(document.uri)));

        testFileWatcher.registerDocumentListeners(context);
        this.setupTestController(context, testFileDiscovery, testFileWatcher, testCollection);
        continuousTestRunner.setupFileChangeListener();

        const runHandler = continuousTestRunner.createRunHandler();
        const testRunProfile = this.registerRunProfiles(runHandler);
        this.registerCommands(context, testRunProfile, testFileDiscovery);
    }

    private setupTestController(
        context: ExtensionContext,
        testFileDiscovery: TestFileDiscovery,
        testFileWatcher: TestFileWatcher,
        testCollection: TestCollection,
    ) {
        const reload = async () => {
            await Promise.all(
                (await testFileDiscovery.getWorkspaceTestPatterns()).map(
                    ({ pattern, exclude }) => testFileDiscovery.findInitialFiles(pattern, exclude),
                ),
            );
        };

        this.ctrl.refreshHandler = reload;
        this.ctrl.resolveHandler = async (item) => {
            if (!item) {
                context.subscriptions.push(...(await testFileWatcher.startWatching()));
                return;
            }

            if (item.uri) {
                await testCollection.add(item.uri);
            }
        };
    }

    private registerRunProfiles(runHandler: (request: TestRunRequest, cancellation: CancellationToken) => Promise<void>) {
        const testRunProfile = this.ctrl.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true, undefined, true);

        if (extensions.getExtension('xdebug.php-debug') !== undefined) {
            this.ctrl.createRunProfile('Debug Tests', TestRunProfileKind.Debug, runHandler, true, undefined, false);
        }

        const coverageProfile = this.ctrl.createRunProfile('Run with Coverage', TestRunProfileKind.Coverage, runHandler, true, undefined, false);
        coverageProfile.loadDetailedCoverage = async (_testRun, coverage) => {
            return (<PHPUnitFileCoverage>coverage).generateDetailedCoverage();
        };

        return testRunProfile;
    }

    private registerCommands(context: ExtensionContext, testRunProfile: TestRunProfile, testFileDiscovery: TestFileDiscovery) {
        const commandHandler = this.container.get<TestCommandRegistry>(TYPES.testCommandRegistry);
        commandHandler.setTestRunProfile(testRunProfile);

        const handler = this.container.get<Handler>(TYPES.handler);

        context.subscriptions.push(commandHandler.reload(async () => {
            await Promise.all(
                (await testFileDiscovery.getWorkspaceTestPatterns()).map(
                    ({ pattern, exclude }) => testFileDiscovery.findInitialFiles(pattern, exclude),
                ),
            );
        }));
        context.subscriptions.push(commandHandler.runAll());
        context.subscriptions.push(commandHandler.runFile());
        context.subscriptions.push(commandHandler.runTestAtCursor());
        context.subscriptions.push(commandHandler.rerun(handler));
        context.subscriptions.push(commandHandler.runByGroup(handler));
    }
}

export async function activate(context: ExtensionContext) {
    const extension = new PHPUnitExtension();
    await extension.activate(context);
}
