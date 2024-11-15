import * as path from 'node:path';
import * as vscode from 'vscode';
import {
    CancellationToken,
    CancellationTokenSource,
    commands,
    EventEmitter,
    OutputChannel,
    Position,
    TestController,
    TestItem,
    TestItemCollection,
    TestRun,
    TestRunProfile,
    TestRunRequest,
    Uri,
    window,
    workspace,
} from 'vscode';
import { URI } from 'vscode-uri';
import { Configuration } from './Configuration';
import { OutputChannelObserver, TestResultObserver } from './Observers';
import { Command, LocalCommand, PHPUnitXML, RemoteCommand, TestDefinition, TestParser, TestRunner } from './PHPUnit';
import { TestCollection } from './TestCollection';

const phpUnitXML = new PHPUnitXML();
const testParser = new TestParser();
let testCollection: TestCollection;


async function updateNodeForDocument(e: vscode.TextDocument) {
    if (!testCollection.has(e.uri)) {
        await testCollection.add(e.uri);
    }
}

async function getWorkspaceTestPatterns() {
    if (!vscode.workspace.workspaceFolders) {
        return [];
    }

    const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));
    const directoryPath = (path: string) => {
        return path === '.' || !path
            ? ''
            : path.replace(new RegExp(['^.[\\|/]', '[\\|/]+$/'].join('|'), 'g'), '') + '/';
    };
    const results = [];
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        const includePatterns = [];
        const excludePatterns = ['**/.git/**', '**/node_modules/**'];

        const configurationFile = await configuration.getConfigurationFile(workspaceFolder.uri.fsPath);
        if (configurationFile) {
            await phpUnitXML.loadFile(Uri.file(configurationFile).fsPath);
            const baseDir = directoryPath(path.dirname(path.relative(workspaceFolder.uri.fsPath, configurationFile)));

            phpUnitXML.getTestSuites().forEach((item) => {
                if (item.tag === 'directory') {
                    const suffix = item.suffix ?? '.php';
                    includePatterns.push(`${baseDir}${directoryPath(item.value)}**/*${suffix}`);
                } else if (item.tag === 'file') {
                    includePatterns.push(`${baseDir}${item.value}`);
                } else if (item.tag === 'exclude') {
                    excludePatterns.push(`${baseDir}${item.value}`);
                }
            });
        }

        if (includePatterns.length === 0) {
            includePatterns.push('**/*.php');
            excludePatterns.push('**/vendor/**');
        }

        results.push({
            workspaceFolder,
            pattern: new vscode.RelativePattern(workspaceFolder, `{${includePatterns.join(',')}}`),
            exclude: new vscode.RelativePattern(workspaceFolder, `{${excludePatterns.join(',')}}`),
        });
    }
    return results;
}

async function findInitialFiles(pattern: vscode.GlobPattern, exclude: vscode.GlobPattern) {
    testCollection.reset();
    await vscode.workspace.findFiles(pattern, exclude).then((files) => {
        return Promise.all(files.map((file) => testCollection.add(file)));
    });
}

async function startWatchingWorkspace(fileChangedEmitter: vscode.EventEmitter<vscode.Uri>) {
    return (await getWorkspaceTestPatterns()).map(({ pattern, exclude }) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate((uri) => {
            testCollection.add(uri);
            fileChangedEmitter.fire(uri);
        });

        watcher.onDidChange((uri) => {
            testCollection.delete(uri);
            testCollection.add(uri);
            fileChangedEmitter.fire(uri);
        });

        watcher.onDidDelete((uri) => {
            testCollection.delete(uri);
        });

        findInitialFiles(pattern, exclude);

        return watcher;
    });
}

export class Handler {
    private latestTestRunRequest: TestRunRequest | undefined;

    constructor(
        private testCollection: TestCollection,
        private configuration: Configuration,
        private outputChannel: OutputChannel,
        private ctrl: TestController,
        private fileChangedEmitter: EventEmitter<Uri>,
    ) {
    }

    getLatestTestRunRequest() {
        return this.latestTestRunRequest;
    }

    async run(request: TestRunRequest, cancellation: CancellationToken) {
        if (!request.continuous) {
            return this.startTestRun(request, cancellation);
        }

        const l = this.fileChangedEmitter.event(async (uri) => {
            await this.testCollection.add(uri);

            await this.startTestRun(
                new TestRunRequest(request.include ?? [], undefined, request.profile, true),
                cancellation,
            );
        });
        cancellation.onCancellationRequested(() => l.dispose());
    }

    private async startTestRun(request: TestRunRequest, cancellation: CancellationToken) {
        const command = await this.createCommand();
        if (!command) {
            return;
        }

        this.latestTestRunRequest = request;
        const run = this.ctrl.createTestRun(request);
        const queueHandler = new TestQueueHandler(this.testCollection, request, run);
        const runner = this.createTestRunner(queueHandler, run, request, cancellation);

        await queueHandler.discoverTests(request.include ?? this.gatherTestItems());
        await queueHandler.runQueue(runner, command);
    }

    private* gatherTestItems(): Generator<TestItem> {
        for (const [_group, files] of this.testCollection.entries()) {
            for (const [_file, tests] of files.entries()) {
                for (const test of tests) {
                    yield test.testItem;
                }
            }
        }
    }

    private async createCommand() {
        const workspaceFolder = await getCurrentWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const options = { cwd: workspaceFolder!.uri.fsPath };

        return this.isRemote()
            ? new RemoteCommand(this.configuration, options)
            : new LocalCommand(this.configuration, options);
    }

    private isRemote() {
        const command = (this.configuration.get('command') as string) ?? '';

        return command.match(/docker|ssh|sail/) !== null;
    }

    private createTestRunner(
        queueHandler: TestQueueHandler,
        run: TestRun,
        request: TestRunRequest,
        cancellation: CancellationToken,
    ) {
        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queueHandler.queue, run, cancellation));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, request));

        return runner;
    }
}

class TestQueueHandler {
    public queue: { testItem: TestItem }[] = [];

    constructor(private testCollection: TestCollection, private request: TestRunRequest, private run: TestRun) {
    }

    public async discoverTests(testItems: Iterable<TestItem>) {
        for (const testItem of testItems) {
            if (this.request.exclude?.includes(testItem)) {
                continue;
            }

            if (!testItem.canResolveChildren) {
                this.run.enqueued(testItem);
                this.queue.push({ testItem: testItem });
            } else {
                await this.discoverTests(this.gatherTestItems(testItem.children));
            }
        }
    }

    public async runQueue(runner: TestRunner, command: Command) {
        if (!this.request.include) {
            return runner.run(command);
        }

        return await Promise.all(
            this.request.include.map((testItem) =>
                runner.run(command.setArguments(this.parseArguments(testItem))),
            ),
        );
    }

    private parseArguments(testItem: TestItem): string {
        if (!testItem.parent) {
            return testItem.uri!.fsPath;
        }

        const testDefinition = this.findTest(testItem);

        return testDefinition
            ? `${this.parseFilter(testDefinition) ?? ''} ${encodeURIComponent(testDefinition.file)}`
            : '';
    }

    private parseFilter(testDefinition: TestDefinition) {
        const deps = [testDefinition.method, ...(testDefinition.annotations.depends ?? [])].join('|');

        return testDefinition.children.length > 0 ? '' : `--filter '^.*::(${deps})( with data set .*)?$'`;
    }

    private findTest(testItem: TestItem) {
        for (const [_group, files] of this.testCollection.entries()) {
            for (const [_file, tests] of files.entries()) {
                for (const test of tests) {
                    if (testItem.id === test.testItem.id) {
                        return test;
                    }

                    for (const child of test.children) {
                        if (testItem.id === child.testItem.id) {
                            return child;
                        }
                    }
                }
            }
        }

        return;
    }

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }
}

async function getCurrentWorkspaceFolder() {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        return null;
    }

    if (workspace.workspaceFolders.length === 1) {
        return workspace.workspaceFolders[0];
    }

    if (window.activeTextEditor) {
        return workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
    }

    return window.showWorkspaceFolderPick();
}


export class CommandHandler {
    constructor(private testCollection: TestCollection, private testRunProfile: TestRunProfile) {
    }

    runAll() {
        return commands.registerCommand('PHPUnit.run-all', () => {
            this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('PHPUnit.run-file', () => {
            if (window.activeTextEditor?.document.uri) {
                this.run(this.findTestItems(window.activeTextEditor.document.uri));
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('PHPUnit.run-test-at-cursor', () => {
            if (window.activeTextEditor?.document.uri) {
                this.run([this.findByPosition(
                    this.findTestItems(window.activeTextEditor.document.uri),
                    window.activeTextEditor!.selection.active!,
                )]);
            }
        });
    }

    rerun(handler: Handler) {
        return commands.registerCommand('PHPUnit.rerun', () => {
            const latestTestRunRequest = handler.getLatestTestRunRequest();

            return latestTestRunRequest ? this.runRequest(latestTestRunRequest) : this.run(undefined);
        });
    }

    private run(include: readonly TestItem[] | undefined) {
        this.runRequest(new TestRunRequest(include, undefined, this.testRunProfile));
    }

    private runRequest(request: TestRunRequest) {
        const cancellation = new CancellationTokenSource().token;

        this.testRunProfile.runHandler(request, cancellation);
    }

    private findByPosition(testItems: TestItem[], position: Position) {
        const byPosition = (testItem: TestItem, position: Position) => {
            if (testItem.canResolveChildren) {
                return false;
            }

            const range = testItem.range!;

            return position.line >= range.start.line && position.line <= range.end.line;
        };

        for (const testItem of testItems) {
            if (byPosition(testItem, position)) {
                return testItem;
            }
            for (const [_id, child] of testItem.children) {
                if (byPosition(child, position)) {
                    return child;
                }
            }
        }

        return testItems[0];
    }

    private findTestItems(uri: URI) {
        for (const [_group, files] of this.testCollection.entries()) {
            for (const [file, tests] of files.entries()) {
                if (uri.fsPath === file) {
                    return tests.map((testDefinition) => testDefinition.testItem);
                }
            }
        }

        return [];
    }
}

export async function activate(context: vscode.ExtensionContext) {
    const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(() =>
            configuration.updateWorkspaceConfiguration(
                vscode.workspace.getConfiguration('phpunit'),
            ),
        ),
    );

    const outputChannel = vscode.window.createOutputChannel('PHPUnit');
    context.subscriptions.push(outputChannel);

    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);

    const configurationFile = await configuration.getConfigurationFile(vscode.workspace.workspaceFolders![0].uri.fsPath);
    if (configurationFile) {
        await phpUnitXML.loadFile(configurationFile);
    }
    testCollection = new TestCollection(ctrl, phpUnitXML, testParser);

    testCollection.reset();
    await Promise.all(vscode.workspace.textDocuments.map((document) => {
        return updateNodeForDocument(document);
    }));

    const reload = async () => {
        await Promise.all(
            (await getWorkspaceTestPatterns()).map(({ pattern, exclude }) =>
                findInitialFiles(pattern, exclude),
            ),
        );
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => updateNodeForDocument(document)),
        vscode.workspace.onDidChangeTextDocument((e) => updateNodeForDocument(e.document)),
    );

    ctrl.refreshHandler = reload;
    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...(await startWatchingWorkspace(fileChangedEmitter)));
        }
    };

    const fileChangedEmitter = new vscode.EventEmitter<vscode.Uri>();
    const handler = new Handler(testCollection, configuration, outputChannel, ctrl, fileChangedEmitter);

    const testRunProfile = ctrl.createRunProfile(
        'Run Tests',
        vscode.TestRunProfileKind.Run,
        (request, cancellation) => handler.run(request, cancellation),
        true,
        undefined,
        true,
    );

    const commandHandler = new CommandHandler(testCollection, testRunProfile);
    context.subscriptions.push(vscode.commands.registerCommand('PHPUnit.reload', reload));
    context.subscriptions.push(commandHandler.runAll());
    context.subscriptions.push(commandHandler.runFile());
    context.subscriptions.push(commandHandler.runTestAtCursor());
    context.subscriptions.push(commandHandler.rerun(handler));
}
