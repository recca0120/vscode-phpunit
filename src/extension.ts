import {
    CancellationToken, EventEmitter, ExtensionContext, extensions, GlobPattern, languages, RelativePattern, TestItem,
    TestRunProfile, TestRunProfileKind, TestRunRequest, tests, Uri, window, workspace, WorkspaceFolder,
} from 'vscode';
import { PHPUnitFileCoverage } from './CloverParser';
import { TestCommandRegistry } from './TestCommandRegistry';
import { Configuration } from './Configuration';
import { Handler } from './Handler';
import { CollisionPrinter } from './Observers';
import { Pattern, PHPUnitXML } from './PHPUnit';
import { TestRunnerFactory } from './TestRunnerFactory';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';

const phpUnitXML = new PHPUnitXML();
const printer = new CollisionPrinter(phpUnitXML);

class PHPUnitExtension {
    private ctrl!: ReturnType<typeof tests.createTestController>;
    private testCollection!: TestCollection;
    private configuration!: Configuration;
    private handler!: Handler;
    private fileChangedEmitter = new EventEmitter<Uri>();
    private watchingTests = new Map<TestItem | 'ALL', TestRunProfile | undefined>();

    async activate(context: ExtensionContext) {
        this.ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        context.subscriptions.push(this.ctrl);
        this.testCollection = new TestCollection(this.ctrl, phpUnitXML);

        const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
        context.subscriptions.push(outputChannel);

        context.subscriptions.push(languages.registerDocumentLinkProvider({ language: 'phpunit' }, new PHPUnitLinkProvider(phpUnitXML)));

        this.configuration = this.createConfiguration(context);
        await this.loadInitialConfiguration();
        await Promise.all(workspace.textDocuments.map((document) => this.testCollection.add(document.uri)));

        this.registerDocumentListeners(context);

        const testRunnerFactory = new TestRunnerFactory(outputChannel, this.configuration, printer);
        this.handler = new Handler(this.ctrl, phpUnitXML, this.configuration, this.testCollection, testRunnerFactory);

        this.setupTestController(context);
        this.setupFileChangeHandler();

        const runHandler = this.createRunHandler();
        const testRunProfile = this.registerRunProfiles(runHandler);

        this.registerCommands(context, testRunProfile);
    }

    private createConfiguration(context: ExtensionContext) {
        const configuration = new Configuration(workspace.getConfiguration('phpunit'));
        context.subscriptions.push(
            workspace.onDidChangeConfiguration(() =>
                configuration.updateWorkspaceConfiguration(workspace.getConfiguration('phpunit')),
            ),
        );

        return configuration;
    }

    private async loadInitialConfiguration() {
        const configurationFile = await this.configuration.getConfigurationFile(workspace.workspaceFolders![0].uri.fsPath);
        if (configurationFile) {
            this.testCollection.reset();
            await phpUnitXML.loadFile(configurationFile);
        }
    }

    private registerDocumentListeners(context: ExtensionContext) {
        context.subscriptions.push(
            workspace.onDidOpenTextDocument((document) => this.testCollection.add(document.uri)),
            workspace.onDidChangeTextDocument((e) => this.testCollection.change(e.document.uri)),
        );
    }

    private setupTestController(context: ExtensionContext) {
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
                await this.testCollection.add(item.uri);
            }
        };
    }

    private setupFileChangeHandler() {
        this.fileChangedEmitter.event(uri => {
            if (this.watchingTests.has('ALL')) {
                this.handler.startTestRun(new TestRunRequest(undefined, undefined, this.watchingTests.get('ALL'), true));
                return;
            }

            const include: TestItem[] = [];
            let profile: TestRunProfile | undefined;
            for (const [testItem, thisProfile] of this.watchingTests) {
                const cast = testItem as TestItem;
                if (cast.uri?.toString() === uri.toString()) {
                    include.push(...this.testCollection.findTestsByFile(cast.uri!));
                    profile = thisProfile;
                }
            }

            if (include.length) {
                this.handler.startTestRun(new TestRunRequest(include, undefined, profile, true));
            }
        });
    }

    private createRunHandler() {
        return async (request: TestRunRequest, cancellation: CancellationToken) => {
            if (!request.continuous) {
                return this.handler.startTestRun(request, cancellation);
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
        const commandHandler = new TestCommandRegistry(this.testCollection, testRunProfile);

        context.subscriptions.push(commandHandler.reload(async () => {
            await Promise.all(
                (await this.getWorkspaceTestPatterns()).map(({ pattern, exclude }) => this.findInitialFiles(pattern, exclude)),
            );
        }));
        context.subscriptions.push(commandHandler.runAll());
        context.subscriptions.push(commandHandler.runFile());
        context.subscriptions.push(commandHandler.runTestAtCursor());
        context.subscriptions.push(commandHandler.rerun(this.handler));
        context.subscriptions.push(commandHandler.runByGroup(this.handler));
    }

    private async getWorkspaceTestPatterns() {
        if (!workspace.workspaceFolders) {
            return [];
        }

        const configuration = new Configuration(workspace.getConfiguration('phpunit'));

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
        this.testCollection.reset();
        const files = await workspace.findFiles(pattern, exclude);
        await Promise.all(files.map((file) => this.testCollection.add(file)));
    }

    private async startWatchingWorkspace() {
        return Promise.all((await this.getWorkspaceTestPatterns()).map(async ({ pattern, exclude }) => {
            const watcher = workspace.createFileSystemWatcher(pattern);

            watcher.onDidCreate((uri) => {
                this.testCollection.add(uri);
                this.fileChangedEmitter.fire(uri);
            });

            watcher.onDidChange((uri) => {
                this.testCollection.change(uri);
                this.fileChangedEmitter.fire(uri);
            });

            watcher.onDidDelete((uri) => {
                this.testCollection.delete(uri);
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
