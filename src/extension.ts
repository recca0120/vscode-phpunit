import * as vscode from 'vscode';
import { CancellationToken, CancellationTokenSource, commands, EventEmitter, OutputChannel, Position, Range, TestController, TestItem, TestItemCollection, TestRun, TestRunProfile, TestRunRequest, Uri, window, workspace } from 'vscode';
import { Configuration } from './configuration';
import { Command, LocalCommand, PHPUnitXML, RemoteCommand, Test, TestCaseParser, TestRunner } from './phpunit';
import { readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { OutputChannelObserver, TestResultObserver } from './observers';

async function findAsyncSequential<T>(
    array: T[],
    predicate: (t: T) => Promise<boolean>,
): Promise<T | undefined> {
    for (const t of array) {
        if (await predicate(t)) {
            return t;
        }
    }
    return undefined;
}

async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        // 嘗試取得檔案狀態
        await stat(filePath);
        return true; // 檔案存在
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return false; // 檔案不存在
        } else {
            throw error; // 其他錯誤
        }
    }
}


async function updateNodeForDocument(e: vscode.TextDocument, ctrl: vscode.TestController) {
    if (e.uri.scheme !== 'file' || !e.uri.path.endsWith('.php')) {
        return;
    }

    const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(e.uri);
    const workspaceTestPattern = (await getWorkspaceTestPatterns()).find(({ workspaceFolder }) => {
        return currentWorkspaceFolder!.name === workspaceFolder.name;
    });

    if (!workspaceTestPattern) {
        return;
    }

    if (vscode.languages.match({ pattern: workspaceTestPattern.exclude.pattern }, e) !== 0) {
        return;
    }

    await getOrCreateFile(ctrl, e.uri);
}

export async function getOrCreateFile(ctrl: vscode.TestController, uri: vscode.Uri) {
    const existing = testData.get(uri.toString());

    if (existing) {
        return;
    }

    const testFile = new TestFile(uri);

    testData.set(uri.toString(), await testFile.update(ctrl));
}

async function getWorkspaceTestPatterns() {
    if (!vscode.workspace.workspaceFolders) {
        return [];
    }

    const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));
    const directoryPath = (path: string) => {
        return path === '.' || !path ? '' : path.replace(/[\\|\/]+$/, '') + '/';
    };
    const results = [];
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        const includePatterns = [];
        const excludePatterns = ['**/.git/**', '**/node_modules/**'];

        const configurationFile = await findAsyncSequential(
            [configuration.getConfigurationFile(), 'phpunit.xml', 'phpunit.dist.xml']
                .filter((file) => !!file)
                .map((file) => path.join(workspaceFolder.uri.fsPath, file!)),
            async (file) => await checkFileExists(file),
        );

        if (configurationFile) {
            const xml = new PHPUnitXML(await readFile(configurationFile));
            const baseDir = directoryPath(path.dirname(path.relative(workspaceFolder.uri.fsPath, configurationFile)));
            for (const item of xml.getTestSuites()) {
                if (item.tagName === 'directory') {
                    includePatterns.push(`${baseDir}${directoryPath(item.value)}**/*.php`);
                } else if (item.tagName === 'file') {
                    includePatterns.push(`${baseDir}${item.value}`);
                } else if (item.tagName === 'exclude') {
                    excludePatterns.push(`${baseDir}${item.value}`);
                }
            }
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

async function findInitialFiles(
    ctrl: vscode.TestController,
    pattern: vscode.GlobPattern,
    exclude: vscode.GlobPattern,
) {
    testData.clear();
    ctrl.items.forEach((item) => ctrl.items.delete(item.id));
    await vscode.workspace.findFiles(pattern, exclude).then((files) => {
        return Promise.all(files.map((file) => getOrCreateFile(ctrl, file)));
    });
}

async function startWatchingWorkspace(ctrl: vscode.TestController, fileChangedEmitter: vscode.EventEmitter<vscode.Uri>) {
    return (await getWorkspaceTestPatterns()).map(({ pattern, exclude }) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate((uri) => {
            getOrCreateFile(ctrl, uri);
            fileChangedEmitter.fire(uri);
        });

        watcher.onDidChange((uri) => {
            const id = uri.toString();
            const testFile = testData.get(id);
            if (testFile) {
                testFile.delete(ctrl);
                testData.delete(id);
            }
            getOrCreateFile(ctrl, uri);
            fileChangedEmitter.fire(uri);
        });

        watcher.onDidDelete((uri) => {
            const id = uri.toString();
            const testFile = testData.get(id);
            if (testFile) {
                testFile.delete(ctrl);
                testData.delete(id);
            }
        });

        findInitialFiles(ctrl, pattern, exclude);

        return watcher;
    });
}

export class Handler {
    private latestTestRunRequest: TestRunRequest | undefined;

    constructor(
        private testData: Map<string, TestFile>,
        private configuration: Configuration,
        private outputChannel: OutputChannel,
        private ctrl: TestController,
        private fileChangedEmitter: EventEmitter<Uri>,
        private getOrCreateFile: Function,
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
            await this.getOrCreateFile(this.ctrl, uri);

            await this.startTestRun(
                new TestRunRequest(
                    request.include ?? [],
                    undefined,
                    request.profile,
                    true,
                ),
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
        const queueHandler = new TestQueueHandler(request, run, this.testData);
        const runner = this.createTestRunner(queueHandler, run, request, cancellation);

        await queueHandler.discoverTests(request.include ?? gatherTestItems(this.ctrl.items));
        await queueHandler.runQueue(runner, command);
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
    public queue: { test: TestItem }[] = [];

    constructor(
        private request: TestRunRequest,
        private run: TestRun,
        private testData: Map<string, TestFile>,
    ) {
    }

    public async discoverTests(tests: Iterable<TestItem>) {
        for (const test of tests) {
            if (this.request.exclude?.includes(test)) {
                continue;
            }

            if (!test.canResolveChildren) {
                this.run.enqueued(test);
                this.queue.push({ test });
            } else {
                await this.discoverTests(gatherTestItems(test.children));
            }
        }
    }

    public async runQueue(runner: TestRunner, command: Command) {
        if (!this.request.include) {
            return runner.run(command);
        }

        return await Promise.all(
            this.request.include.map((test) =>
                runner.run(command.setArguments(this.getTestArguments(test))),
            ),
        );
    }

    private getTestArguments(test: TestItem) {
        return !test.parent
            ? test.uri!.fsPath
            : this.testData.get(test.parent.uri!.toString())!.getArguments(test.id);
    }
}

function gatherTestItems(collection: TestItemCollection) {
    const items: TestItem[] = [];
    collection.forEach((item) => items.push(item));
    return items;
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

const textDecoder = new TextDecoder('utf-8');

const parser = new TestCaseParser();

export class TestFile {
    private suites: Test[] = [];
    private testItems: TestItem[] = [];

    constructor(public uri: Uri) {
    }

    async update(ctrl: TestController) {
        const rawContent = textDecoder.decode(await workspace.fs.readFile(this.uri));
        parser.parse(rawContent, this.uri.fsPath, {
            onSuite: (suite: Test) => {
                const testItem = ctrl.createTestItem(suite.id, suite.label, this.uri);
                testItem.canResolveChildren = true;
                testItem.sortText = suite.id;
                testItem.range = new Range(
                    new Position(suite.start.line - 1, suite.start.character),
                    new Position(suite.end.line - 1, suite.end.character),
                );

                ctrl.items.add(testItem);
                this.suites.push(suite);
            },
            onTest: (test: Test, index) => {
                const testItem = ctrl.createTestItem(test.id, test.label, this.uri);
                testItem.canResolveChildren = false;
                testItem.sortText = `${index}`;
                testItem.range = new Range(
                    new Position(test.start.line - 1, test.start.character),
                    new Position(test.end.line - 1, test.end.character),
                );

                ctrl.items.get(test.parent!.id)!.children.add(testItem);
                this.testItems.push(testItem);
            },
        });

        return this;
    }

    delete(ctrl: TestController) {
        this.testItems.forEach((testItem) => ctrl.items.delete(testItem.id));
        this.suites = [];
        this.testItems = [];
    }

    getArguments(testId: string): string {
        const test = this.findTest(testId);

        return test ? `${(this.asFilter(test) ?? '')} ${encodeURIComponent(test.file)}` : '';
    }

    getTestItems() {
        return this.testItems;
    }

    findTestItemByPosition(position: Position) {
        return (
            this.doFindTestItem(this.testItems, (testItem: TestItem) => {
                if (testItem.canResolveChildren) {
                    return false;
                }

                const range = testItem.range!;

                return position.line >= range.start.line && position.line <= range.end.line;
            }) ?? this.testItems[0]
        );
    }

    private doFindTestItem(testItems: TestItem[], filter: (testItem: TestItem) => boolean): TestItem | void {
        for (const testItem of testItems) {
            if (filter(testItem)) {
                return testItem;
            }

            if (testItem.children.size > 0) {
                return this.doFindTestItem(this.gatherTestItems(testItem.children), filter);
            }
        }
    }

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }

    private findTest(testId: string) {
        return this.doFindTest(this.suites, (test: Test) => testId === test.id);
    }

    private doFindTest(tests: Test[], filter: (test: Test) => boolean): Test | void {
        for (const test of tests) {
            if (filter(test)) {
                return test;
            }

            if (test.children.length > 0) {
                return this.doFindTest(test.children, filter);
            }
        }
    }

    private asFilter(test: Test) {
        const deps = [test.method, ...(test.annotations.depends ?? [])].join('|');

        return test.children.length > 0 ? '' : `--filter '^.*::(${deps})( with data set .*)?$'`;
    }
}

export class CommandHandler {
    constructor(private testRunProfile: TestRunProfile, private testData: Map<string, TestFile>) {
    }

    runAll() {
        return commands.registerCommand('phpunit.run-all', () => {
            this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('phpunit.run-file', () => {
            const testFile = this.findTestFile();

            if (testFile) {
                this.run(testFile.getTestItems());
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('phpunit.run-test-at-cursor', () => {
            const testFile = this.findTestFile();

            if (testFile) {
                this.run([
                    testFile.findTestItemByPosition(window.activeTextEditor!.selection.active)!,
                ]);
            }
        });
    }

    rerun(handler: Handler) {
        return commands.registerCommand('phpunit.rerun', () => {
            const latestTestRunRequest = handler.getLatestTestRunRequest();

            return latestTestRunRequest
                ? this.runRequest(latestTestRunRequest)
                : this.run(undefined);
        });
    }

    private run(include: readonly TestItem[] | undefined) {
        this.runRequest(new TestRunRequest(include, undefined, this.testRunProfile));
    }

    private runRequest(request: TestRunRequest) {
        const cancellation = new CancellationTokenSource().token;

        this.testRunProfile.runHandler(request, cancellation);
    }

    private findTestFile(): TestFile | null {
        if (!window.activeTextEditor) {
            return null;
        }

        return this.testData.get(window.activeTextEditor.document.uri.toString())!;
    }
}

const testData = new Map<string, TestFile>();

export async function activate(context: vscode.ExtensionContext) {
    const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => configuration.updateWorkspaceConfiguration(vscode.workspace.getConfiguration('phpunit'))));

    const outputChannel = vscode.window.createOutputChannel('PHPUnit');
    context.subscriptions.push(outputChannel);

    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);

    testData.clear();
    await Promise.all(
        vscode.workspace.textDocuments.map((document) => {
            return updateNodeForDocument(document, ctrl);
        }),
    );

    const reload = async () => {
        await Promise.all(
            (await getWorkspaceTestPatterns()).map(({ pattern, exclude }) =>
                findInitialFiles(ctrl, pattern, exclude),
            ),
        );
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => updateNodeForDocument(document, ctrl)),
        vscode.workspace.onDidChangeTextDocument((e) => updateNodeForDocument(e.document, ctrl)),
    );

    ctrl.refreshHandler = reload;
    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...(await startWatchingWorkspace(ctrl, fileChangedEmitter)));
        }
    };

    const fileChangedEmitter = new vscode.EventEmitter<vscode.Uri>();
    const handler = new Handler(testData, configuration, outputChannel, ctrl, fileChangedEmitter, getOrCreateFile);

    const testRunProfile = ctrl.createRunProfile(
        'Run Tests',
        vscode.TestRunProfileKind.Run,
        (request, cancellation) => handler.run(request, cancellation),
        true,
        undefined,
        true,
    );

    const commandHandler = new CommandHandler(testRunProfile, testData);
    context.subscriptions.push(vscode.commands.registerCommand('phpunit.reload', reload));
    context.subscriptions.push(commandHandler.runAll());
    context.subscriptions.push(commandHandler.runFile());
    context.subscriptions.push(commandHandler.runTestAtCursor());
    context.subscriptions.push(commandHandler.rerun(handler));
}

