import * as vscode from 'vscode';
import { TestRunner } from './phpunit/test-runner';
import { LocalCommand, RemoteCommand } from './phpunit/command';
import { Configuration } from './configuration';
import { TestFile } from './test-file';
import { OutputChannelObserver, TestResultObserver } from './observers';

const testData = new Map<string, TestFile>();
let configuration: Configuration;
let outputChannel: vscode.OutputChannel;
let ctrl: vscode.TestController;

export async function activate(context: vscode.ExtensionContext) {
    configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));

    outputChannel = vscode.window.createOutputChannel('PHPUnit');
    context.subscriptions.push(outputChannel);

    ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);

    const handler = new Handler(testData, configuration, outputChannel, ctrl);

    ctrl.refreshHandler = async () => {
        await Promise.all(
            getWorkspaceTestPatterns().map(({ pattern, exclude }) =>
                findInitialFiles(ctrl, pattern, exclude)
            )
        );
    };

    const testRunProfile = ctrl.createRunProfile(
        'Run Tests',
        vscode.TestRunProfileKind.Run,
        (request, cancellation) => handler.run(request, cancellation),
        true
    );

    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...startWatchingWorkspace(ctrl));
        }
    };

    async function updateNodeForDocument(e: vscode.TextDocument) {
        if (e.uri.scheme !== 'file' || !e.uri.path.endsWith('.php')) {
            return;
        }

        const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(e.uri);
        const workspaceTestPattern = getWorkspaceTestPatterns().find(({ workspaceFolder }) => {
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

    testData.clear();
    await Promise.all(
        vscode.workspace.textDocuments.map((document) => updateNodeForDocument(document))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('phpunit.reload', async () => {
            await Promise.all(
                getWorkspaceTestPatterns().map(({ pattern, exclude }) =>
                    findInitialFiles(ctrl, pattern, exclude)
                )
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('phpunit.run-all', () => {
            testRunProfile.runHandler(
                new vscode.TestRunRequest(undefined, undefined, testRunProfile),
                new vscode.CancellationTokenSource().token
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('phpunit.run-file', () => {
            if (!vscode.window.activeTextEditor) {
                return;
            }

            const testFile = testData.get(vscode.window.activeTextEditor.document.uri.toString())!;

            if (!testFile) {
                return;
            }

            testRunProfile.runHandler(
                new vscode.TestRunRequest(testFile.testItems, undefined, testRunProfile),
                new vscode.CancellationTokenSource().token
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('phpunit.run-test-at-cursor', () => {
            if (!vscode.window.activeTextEditor) {
                return;
            }

            const activeTextEditor = vscode.window.activeTextEditor;
            const testFile = testData.get(activeTextEditor.document.uri.toString())!;

            if (!testFile) {
                return;
            }

            testRunProfile.runHandler(
                new vscode.TestRunRequest(
                    [testFile.findTestItemByPosition(activeTextEditor.selection.active)!],
                    undefined,
                    testRunProfile
                ),
                new vscode.CancellationTokenSource().token
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('phpunit.rerun', () => {
            const request =
                handler.getLatestTestRunRequest() ??
                new vscode.TestRunRequest(undefined, undefined, testRunProfile);

            testRunProfile.runHandler(request, new vscode.CancellationTokenSource().token);
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(() =>
            configuration.updateWorkspaceConfiguration(vscode.workspace.getConfiguration('phpunit'))
        ),
        vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
        vscode.workspace.onDidChangeTextDocument((e) => updateNodeForDocument(e.document))
    );
}

async function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) {
    const existing = testData.get(uri.toString());

    if (existing) {
        return;
    }

    const testFile = new TestFile(uri);

    testData.set(uri.toString(), await testFile.update(controller));
}

function getWorkspaceTestPatterns() {
    if (!vscode.workspace.workspaceFolders) {
        return [];
    }

    return vscode.workspace.workspaceFolders.map((workspaceFolder) => ({
        workspaceFolder,
        pattern: new vscode.RelativePattern(workspaceFolder, '**/*.php'),
        exclude: new vscode.RelativePattern(workspaceFolder, '**/{.git,node_modules,vendor}/**'),
    }));
}

async function findInitialFiles(
    controller: vscode.TestController,
    pattern: vscode.GlobPattern,
    exclude: vscode.GlobPattern
) {
    testData.clear();
    controller.items.forEach((item) => controller.items.delete(item.id));
    await vscode.workspace.findFiles(pattern, exclude).then((files) => {
        return Promise.all(files.map((file) => getOrCreateFile(controller, file)));
    });
}

function startWatchingWorkspace(controller: vscode.TestController) {
    return getWorkspaceTestPatterns().map(({ pattern, exclude }) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate((uri) => getOrCreateFile(controller, uri));
        watcher.onDidChange((uri) => {
            const id = uri.toString();
            const testFile = testData.get(id);
            if (testFile) {
                testFile.delete(controller);
                testData.delete(id);
            }

            return getOrCreateFile(controller, uri);
        });

        watcher.onDidDelete((uri) => {
            const id = uri.toString();
            const testFile = testData.get(id);
            if (testFile) {
                testFile.delete(controller);
                testData.delete(id);
            }
        });

        findInitialFiles(controller, pattern, exclude);

        return watcher;
    });
}

class Handler {
    private latestTestRunRequest: vscode.TestRunRequest | undefined;

    constructor(
        private testData: Map<string, TestFile>,
        private configuration: Configuration,
        private outputChannel: vscode.OutputChannel,
        private ctrl: vscode.TestController
    ) {}

    getLatestTestRunRequest() {
        return this.latestTestRunRequest;
    }

    async run(request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) {
        this.latestTestRunRequest = request;

        const queue: { test: vscode.TestItem }[] = [];
        const run = this.ctrl.createTestRun(request);

        const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
            for (const test of tests) {
                if (request.exclude?.includes(test)) {
                    continue;
                }

                if (!test.canResolveChildren) {
                    run.enqueued(test);
                    queue.push({ test });
                } else {
                    await discoverTests(this.gatherTestItems(test.children));
                }
            }
        };

        const getArguments = (test: vscode.TestItem) => {
            return !test.parent
                ? test.uri!.fsPath
                : this.testData.get(test.parent.uri!.toString())!.getArguments(test.id);
        };

        const runTestQueue = async () => {
            const currentWorkspaceFolder = await this.getCurrentWorkspaceFolder();
            if (!currentWorkspaceFolder) {
                run.end();
                return;
            }
            const options = { cwd: currentWorkspaceFolder.uri.fsPath };

            const command = ((this.configuration.get('command') as string) ?? '').match(
                /docker|ssh/
            )
                ? new RemoteCommand(this.configuration, options)
                : new LocalCommand(this.configuration, options);

            const runner = new TestRunner();
            runner.observe(new TestResultObserver(queue, run, cancellation));
            runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration));

            if (!request.include) {
                await runner.run(command);

                return;
            }

            await Promise.all(
                request.include.map((test) => runner.run(command.setArguments(getArguments(test))))
            );
        };

        return discoverTests(request.include ?? this.gatherTestItems(this.ctrl.items)).then(
            runTestQueue
        );
    }

    private async getCurrentWorkspaceFolder() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return null;
        }

        if (vscode.workspace.workspaceFolders.length === 1) {
            return vscode.workspace.workspaceFolders[0];
        }

        if (vscode.window.activeTextEditor) {
            return vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
        }

        return vscode.window.showWorkspaceFolderPick();
    }

    private gatherTestItems(collection: vscode.TestItemCollection) {
        const items: vscode.TestItem[] = [];
        collection.forEach((item) => items.push(item));
        return items;
    }
}
