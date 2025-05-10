import * as vscode from 'vscode';
import {
    CancellationToken, EventEmitter, extensions, GlobPattern, languages, RelativePattern, TestItem,
    TestRunProfile, TestRunProfileKind, TestRunRequest, tests, Uri, window, workspace, WorkspaceFolder, Disposable
} from 'vscode';
import { PHPUnitFileCoverage } from './CloverParser';
import { CommandHandler } from './CommandHandler';
import { Configuration } from './Configuration';
import { Handler } from './Handler';
import { CollisionPrinter } from './Observers';
import { Pattern, PHPUnitXML } from './PHPUnit';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { ContinuousTestRunner } from './ContinuousTestRunner'; // Import the new class

class ExtensionManager implements Disposable {
    private readonly ctrl: vscode.TestController;
    private readonly phpUnitXML: PHPUnitXML;
    private readonly printer: CollisionPrinter;
    private readonly testCollection: TestCollection;
    private readonly outputChannel: vscode.OutputChannel;
    private readonly configuration: Configuration;
    private readonly handler: Handler;
    private readonly fileChangedEmitter = new EventEmitter<vscode.Uri>();
    private readonly continuousTestRunner: ContinuousTestRunner; // Add instance of the new class
    private disposables: Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        this.disposables.push(this.ctrl);

        this.phpUnitXML = new PHPUnitXML();
        this.printer = new CollisionPrinter(this.phpUnitXML);
        this.testCollection = new TestCollection(this.ctrl, this.phpUnitXML);

        this.outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
        this.disposables.push(this.outputChannel);

        this.disposables.push(languages.registerDocumentLinkProvider({ language: 'phpunit' }, new PHPUnitLinkProvider(this.phpUnitXML)));

        this.configuration = new Configuration(workspace.getConfiguration('phpunit'));
        this.disposables.push(workspace.onDidChangeConfiguration(() => this.configuration.updateWorkspaceConfiguration(workspace.getConfiguration('phpunit'))));

        this.handler = new Handler(this.ctrl, this.phpUnitXML, this.configuration, this.testCollection, this.outputChannel, this.printer);

        // Instantiate ContinuousTestRunner
        this.continuousTestRunner = new ContinuousTestRunner(this.handler, this.testCollection, this.fileChangedEmitter);
        this.disposables.push(this.continuousTestRunner); // Add to disposables
    }

    async activate() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
             // Handle case with no workspace folder
             console.warn('No workspace folder found.');
             return;
        }
        const configurationFile = await this.configuration.getConfigurationFile(vscode.workspace.workspaceFolders[0].uri.fsPath);
        if (configurationFile) {
            this.testCollection.reset();
            await this.phpUnitXML.loadFile(configurationFile);
        }

        // Call the public add method on the refactored TestCollection
        await Promise.all(vscode.workspace.textDocuments.map((document) => this.testCollection.add(document.uri)));

        const reload = async () => {
            await Promise.all(
                (await this.getWorkspaceTestPatterns()).map(({ pattern, exclude }) => this.findInitialFiles(pattern, exclude)),
            );
        };

        this.disposables.push(
            // Call the public add method on the refactored TestCollection
            vscode.workspace.onDidOpenTextDocument((document) => this.testCollection.add(document.uri)),
            // Call the public change method on the refactored TestCollection
            vscode.workspace.onDidChangeTextDocument((e) => this.testCollection.change(e.document.uri)),
        );

        this.ctrl.refreshHandler = reload;
        this.ctrl.resolveHandler = async (item: vscode.TestItem | undefined) => {
            if (!item) {
                this.disposables.push(...(await this.startWatchingWorkspace(this.fileChangedEmitter)));
                return;
            }

            if (item.uri) {
                // Call the public add method on the refactored TestCollection
                await this.testCollection.add(item.uri);
            }
        };

        // Remove fileChangedEmitter event listener from here, it's now in ContinuousTestRunner

        const runHandler = async (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
            if (!request.continuous) {
                return this.handler.startTestRun(request, cancellation);
            }

            // Delegate continuous run handling to ContinuousTestRunner
            this.continuousTestRunner.handleRunRequest(request, cancellation);
        };
        const testRunProfile = this.ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true, undefined, true);
        if (extensions.getExtension('xdebug.php-debug') !== undefined) {
            this.ctrl.createRunProfile('Debug Tests', vscode.TestRunProfileKind.Debug, runHandler, true, undefined, false);
        }
        const coverageProfile = this.ctrl.createRunProfile('Run with Coverage', vscode.TestRunProfileKind.Coverage, runHandler, true, undefined, false); // TODO Continuous
        coverageProfile.loadDetailedCoverage = async (_testRun: vscode.TestRun, coverage: vscode.FileCoverage) => {
            return (<PHPUnitFileCoverage>coverage).detailedCoverage;
        };
        const commandHandler = new CommandHandler(this.testCollection, testRunProfile);

        this.disposables.push(commandHandler.reload(reload));
        this.disposables.push(commandHandler.runAll());
        this.disposables.push(commandHandler.runFile());
        this.disposables.push(commandHandler.runTestAtCursor());
        this.disposables.push(commandHandler.rerun(this.handler));

        this.context.subscriptions.push(this); // Add ExtensionManager to subscriptions
    }

    async getWorkspaceTestPatterns() {
        if (!vscode.workspace.workspaceFolders) {
            return [];
        }

        const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));

        return Promise.all(vscode.workspace.workspaceFolders.map(async (workspaceFolder: vscode.WorkspaceFolder) => {
            const configurationFile = await configuration.getConfigurationFile(workspaceFolder.uri.fsPath);
            configurationFile
                ? await this.phpUnitXML.loadFile(vscode.Uri.file(configurationFile).fsPath)
                : this.phpUnitXML.setRoot(workspaceFolder.uri.fsPath);
            const { includes, excludes } = this.phpUnitXML.getPatterns(workspaceFolder.uri.fsPath);

            const generateRelativePattern = (includeOrExclude: Pattern) => {
                const { uri, pattern } = includeOrExclude.toGlobPattern();

                return new vscode.RelativePattern(uri, pattern);
            };

            return {
                workspaceFolder,
                pattern: generateRelativePattern(includes),
                exclude: generateRelativePattern(excludes),
            };
        }));
    }

    async findInitialFiles(pattern: vscode.GlobPattern, exclude: vscode.GlobPattern) {
        this.testCollection.reset();
        const files = await vscode.workspace.findFiles(pattern, exclude);
        await Promise.all(files.map((file) => this.testCollection.add(file)));
    }

    async startWatchingWorkspace(fileChangedEmitter: EventEmitter<vscode.Uri>) {
        return Promise.all((await this.getWorkspaceTestPatterns()).map(async ({ pattern, exclude }) => {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            watcher.onDidCreate((uri) => {
                this.testCollection.add(uri);
                fileChangedEmitter.fire(uri);
            });

            watcher.onDidChange((uri) => {
                this.testCollection.change(uri);
                fileChangedEmitter.fire(uri);
            });

            watcher.onDidDelete((uri) => {
                this.testCollection.delete(uri);
            });

            await this.findInitialFiles(pattern, exclude);

            return watcher;
        }));
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.fileChangedEmitter.dispose(); // Emitter is still owned by ExtensionManager
    }
}


export async function activate(context: vscode.ExtensionContext) {
    const manager = new ExtensionManager(context);
    await manager.activate();
}

// This method is called when your extension is deactivated
export function deactivate() {
    // The ExtensionManager will be disposed automatically when context.subscriptions are disposed
}
