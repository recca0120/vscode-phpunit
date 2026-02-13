import 'reflect-metadata';
import {
    CancellationToken, EventEmitter, ExtensionContext, extensions, GlobPattern, languages, RelativePattern, TestItem,
    TestRunProfile, TestRunProfileKind, TestRunRequest, tests, Uri, window, workspace, WorkspaceFolder,
} from 'vscode';
import { Container } from 'inversify';
import { PHPUnitFileCoverage } from './CloverParser';
import { TestCommandRegistry } from './TestCommandRegistry';
import { Configuration } from './Configuration';
import { createContainer } from './container';
import { Handler } from './Handler';
import { Pattern, PHPUnitXML } from './PHPUnit';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { TYPES } from './types';

class PHPUnitExtension {
    private container!: Container;
    private ctrl!: ReturnType<typeof tests.createTestController>;
    private watchingTests = new Map<TestItem | 'ALL', TestRunProfile | undefined>();

    async activate(context: ExtensionContext) {
        this.ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        context.subscriptions.push(this.ctrl);

        const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
        context.subscriptions.push(outputChannel);

        this.container = createContainer(this.ctrl, outputChannel);

        const fileChangedEmitter = this.container.get<EventEmitter<Uri>>(TYPES.fileChangedEmitter);
        context.subscriptions.push(fileChangedEmitter);

        this.setupConfigurationListener(context);

        context.subscriptions.push(languages.registerDocumentLinkProvider(
            { language: 'phpunit' },
            this.container.get<PHPUnitLinkProvider>(TYPES.phpUnitLinkProvider),
        ));

        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);

        await this.loadInitialConfiguration();
        await Promise.all(workspace.textDocuments.map((document) => testCollection.add(document.uri)));

        this.registerDocumentListeners(context);
        this.setupTestController(context);
        this.setupFileChangeHandler();

        const runHandler = this.createRunHandler();
        const testRunProfile = this.registerRunProfiles(runHandler);
        this.registerCommands(context, testRunProfile);
    }

    private setupConfigurationListener(context: ExtensionContext) {
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
    }

    private async loadInitialConfiguration() {
        const configuration = this.container.get<Configuration>(TYPES.configuration);
        const phpUnitXML = this.container.get<PHPUnitXML>(TYPES.phpUnitXML);
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);

        const configurationFile = await configuration.getConfigurationFile(workspace.workspaceFolders![0].uri.fsPath);
        if (configurationFile) {
            testCollection.reset();
            await phpUnitXML.loadFile(configurationFile);
        }
    }

    private registerDocumentListeners(context: ExtensionContext) {
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);
        context.subscriptions.push(
            workspace.onDidOpenTextDocument((document) => testCollection.add(document.uri)),
            workspace.onDidChangeTextDocument((e) => testCollection.change(e.document.uri)),
        );
    }

    private setupTestController(context: ExtensionContext) {
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);

        const reload = async () => {
            await Promise.all(
                (await this.getWorkspaceTestPatterns()).map(({ pattern, exclude }) => this.findInitialFiles(pattern, exclude)),
            );
        };

        this.ctrl.refreshHandler = reload;
        this.ctrl.resolveHandler = async (item) => {
            if (!item) {
                context.subscriptions.push(...(await this.startWatchingWorkspace()));
                return;
            }

            if (item.uri) {
                await testCollection.add(item.uri);
            }
        };
    }

    private setupFileChangeHandler() {
        const fileChangedEmitter = this.container.get<EventEmitter<Uri>>(TYPES.fileChangedEmitter);
        const handler = this.container.get<Handler>(TYPES.handler);
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);

        fileChangedEmitter.event(uri => {
            if (this.watchingTests.has('ALL')) {
                handler.startTestRun(new TestRunRequest(undefined, undefined, this.watchingTests.get('ALL'), true));
                return;
            }

            const include: TestItem[] = [];
            let profile: TestRunProfile | undefined;
            for (const [testItem, thisProfile] of this.watchingTests) {
                const cast = testItem as TestItem;
                if (cast.uri?.toString() === uri.toString()) {
                    include.push(...testCollection.findTestsByFile(cast.uri!));
                    profile = thisProfile;
                }
            }

            if (include.length) {
                handler.startTestRun(new TestRunRequest(include, undefined, profile, true));
            }
        });
    }

    private createRunHandler() {
        const handler = this.container.get<Handler>(TYPES.handler);

        return async (request: TestRunRequest, cancellation: CancellationToken) => {
            if (!request.continuous) {
                return handler.startTestRun(request, cancellation);
            }

            if (request.include === undefined) {
                this.watchingTests.set('ALL', request.profile);
                cancellation.onCancellationRequested(() => this.watchingTests.delete('ALL'));
            } else {
                request.include.forEach(testItem => this.watchingTests.set(testItem, request.profile));
                cancellation.onCancellationRequested(() => request.include!.forEach(testItem => this.watchingTests.delete(testItem)));
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

    private registerCommands(context: ExtensionContext, testRunProfile: TestRunProfile) {
        const commandHandler = this.container.get<TestCommandRegistry>(TYPES.testCommandRegistry);
        commandHandler.setTestRunProfile(testRunProfile);

        const handler = this.container.get<Handler>(TYPES.handler);

        context.subscriptions.push(commandHandler.reload(async () => {
            await Promise.all(
                (await this.getWorkspaceTestPatterns()).map(({ pattern, exclude }) => this.findInitialFiles(pattern, exclude)),
            );
        }));
        context.subscriptions.push(commandHandler.runAll());
        context.subscriptions.push(commandHandler.runFile());
        context.subscriptions.push(commandHandler.runTestAtCursor());
        context.subscriptions.push(commandHandler.rerun(handler));
        context.subscriptions.push(commandHandler.runByGroup(handler));
    }

    private async getWorkspaceTestPatterns() {
        if (!workspace.workspaceFolders) {
            return [];
        }

        const configuration = new Configuration(workspace.getConfiguration('phpunit'));
        const phpUnitXML = this.container.get<PHPUnitXML>(TYPES.phpUnitXML);

        return Promise.all(workspace.workspaceFolders.map(async (workspaceFolder: WorkspaceFolder) => {
            const configurationFile = await configuration.getConfigurationFile(workspaceFolder.uri.fsPath);
            configurationFile
                ? await phpUnitXML.loadFile(Uri.file(configurationFile).fsPath)
                : phpUnitXML.setRoot(workspaceFolder.uri.fsPath);
            const { includes, excludes } = phpUnitXML.getPatterns(workspaceFolder.uri.fsPath);

            const toRelativePattern = (pattern: Pattern) => {
                const { uri, pattern: glob } = pattern.toGlobPattern();
                return new RelativePattern(uri, glob);
            };

            return {
                workspaceFolder,
                pattern: toRelativePattern(includes),
                exclude: toRelativePattern(excludes),
            };
        }));
    }

    private async findInitialFiles(pattern: GlobPattern, exclude: GlobPattern) {
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);
        testCollection.reset();
        const files = await workspace.findFiles(pattern, exclude);
        await Promise.all(files.map((file) => testCollection.add(file)));
    }

    private async startWatchingWorkspace() {
        const testCollection = this.container.get<TestCollection>(TYPES.testCollection);
        const fileChangedEmitter = this.container.get<EventEmitter<Uri>>(TYPES.fileChangedEmitter);

        return Promise.all((await this.getWorkspaceTestPatterns()).map(async ({ pattern, exclude }) => {
            const watcher = workspace.createFileSystemWatcher(pattern);

            watcher.onDidCreate((uri) => {
                testCollection.add(uri);
                fileChangedEmitter.fire(uri);
            });

            watcher.onDidChange((uri) => {
                testCollection.change(uri);
                fileChangedEmitter.fire(uri);
            });

            watcher.onDidDelete((uri) => {
                testCollection.delete(uri);
            });

            await this.findInitialFiles(pattern, exclude);

            return watcher;
        }));
    }
}

export async function activate(context: ExtensionContext) {
    const extension = new PHPUnitExtension();
    await extension.activate(context);
}
