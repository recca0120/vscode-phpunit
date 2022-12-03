import * as vscode from 'vscode';
import { TestRun } from 'vscode';
import { TestRunner, TestRunnerObserver } from './phpunit/test-runner';
import { TestResult } from './phpunit/problem-matcher';
import { DockerCommand, LocalCommand } from './phpunit/command';
import { Configuration } from './configuration';
import { TestFile } from './test-file';

const testData = new Map<string, TestFile>();

class Observer implements TestRunnerObserver {
    constructor(
        private queue: { test: vscode.TestItem }[] = [],
        private run: TestRun,
        private cancellation: vscode.CancellationToken
    ) {}

    close(): void {
        this.run.end();
    }

    // line(line: string): void {}
    //
    // result(result: Result): void {}

    testSuiteStarted(result: TestResult): void {
        this.testStarted(result);
    }

    testSuiteFinished(result: TestResult): void {
        this.testFinished(result);
    }

    testStarted(result: TestResult): void {
        this.doRun('started', result, (test) => this.run.started(test));
    }

    testFinished(result: TestResult): void {
        this.doRun('finished', result, (test) => this.run.passed(test));
    }

    testFailed(result: TestResult): void {
        this.doRun('finished', result, (test) =>
            this.run.failed(test, this.message(result, test), result.duration)
        );
    }

    testIgnored(result: TestResult): void {
        this.doRun('finished', result, (test) => this.run.skipped(test));
    }

    private message(result: TestResult, test: vscode.TestItem) {
        const message = vscode.TestMessage.diff(result.message, result.expected!, result.actual!);
        const details = result.details;
        if (details.length > 0) {
            message.location = new vscode.Location(
                test.uri!,
                new vscode.Range(
                    new vscode.Position(details[0].line - 1, 0),
                    new vscode.Position(details[0].line - 1, 0)
                )
            );
        }
        return message;
    }

    private doRun(
        type: 'started' | 'finished',
        result: TestResult,
        fn: (test: vscode.TestItem) => void
    ) {
        const test = this.find(result);
        if (!test) {
            return;
        }

        if (this.cancellation.isCancellationRequested) {
            this.run.skipped(test);
            return;
        }

        if (type === 'started') {
            this.run.appendOutput(`Running ${result.id}\r\n`);
        }

        fn(test);

        if (type === 'finished') {
            this.run.appendOutput(`Completed ${result.id}\r\n`);
        }
    }

    private find(result: TestResult) {
        return this.queue.find(({ test }) => test.id === result.testId)?.test;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);
    vscode.workspace.getConfiguration();

    const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));

    const runHandler = (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
        const queue: { test: vscode.TestItem }[] = [];
        const run = ctrl.createTestRun(request);

        const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
            for (const test of tests) {
                if (request.exclude?.includes(test)) {
                    continue;
                }

                if (!test.canResolveChildren) {
                    run.enqueued(test);
                    queue.push({ test });
                } else {
                    await discoverTests(gatherTestItems(test.children));
                }
            }
        };

        const command = (configuration.get('command', '') as string).match(/docker/)
            ? new DockerCommand(configuration)
            : new LocalCommand(configuration);

        const runner = new TestRunner();
        runner.registerObserver(new Observer(queue, run, cancellation));

        const runTestQueue = async () => {
            const options = { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath };

            if (request.include === undefined) {
                await runner.run(command.setArguments(''), options);

                return;
            }

            for (const test of request.include) {
                const testFile = testData.get(test.parent?.uri?.toString() ?? '');
                const args = testFile?.getArguments(test.id) ?? test.uri!.fsPath;

                await runner.run(command.setArguments(args), options);
            }
        };

        return discoverTests(request.include ?? gatherTestItems(ctrl.items)).then(runTestQueue);
    };

    ctrl.refreshHandler = async () => {
        await Promise.all(
            getWorkspaceTestPatterns().map(({ pattern, exclude }) =>
                findInitialFiles(ctrl, pattern, exclude)
            )
        );
    };

    ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true);

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

    // controller.createTestItem(test.id)

    // const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);
    // controller.items.add(file);
    //
    // const data = new TestFile();
    // testData.set(file, data);
    //
    // file.canResolveChildren = true;
    // return { file, data };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
    const items: vscode.TestItem[] = [];
    collection.forEach((item) => items.push(item));
    return items;
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
