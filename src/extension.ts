import * as vscode from 'vscode';
import { parse, Test } from './phpunit/parser';
import { TestRunner, TestRunnerEvent } from './phpunit/test-runner';
import { Result, TestEvent } from './phpunit/problem-matcher';
import { LocalCommand } from './phpunit/command';
import { Configuration } from './configuration';

const textDecoder = new TextDecoder('utf-8');
const testData = new Map<string, TestFile>();

class TestFile {
    constructor(
        public uri: vscode.Uri,
        public tests: Test[],
        public testItems: vscode.TestItem[]
    ) {}
}

export async function activate(context: vscode.ExtensionContext) {
    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);
    vscode.workspace.getConfiguration();

    const command = new LocalCommand(
        new Configuration(vscode.workspace.getConfiguration('phpunit'))
    );

    const runHandler = (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
        const queue: { test: vscode.TestItem }[] = [];
        const run = ctrl.createTestRun(request);
        // map of file uris to statements on each line:
        const coveredLines = new Map<string, (vscode.StatementCoverage | undefined)[]>();

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

                if (test.uri && !coveredLines.has(test.uri.toString())) {
                    try {
                        const rawContent = await vscode.workspace.fs.readFile(test.uri);
                        const lines = textDecoder.decode(rawContent).split('\n');

                        coveredLines.set(
                            test.uri.toString(),
                            lines.map((lineText, lineNo) =>
                                lineText.trim().length
                                    ? new vscode.StatementCoverage(
                                          0,
                                          new vscode.Position(lineNo, 0)
                                      )
                                    : undefined
                            )
                        );
                    } catch {
                        // ignored
                    }
                }
            }
        };

        const testRunner = new TestRunner();

        testRunner.on(TestRunnerEvent.result, (result: Result) => {
            if (!('event' in result && 'id' in result)) {
                return;
            }

            const testId = `${result.id.replace(/\swith\sdata\sset\s#\d+/, '')}`;
            const test = queue.find(({ test }) => test.id === testId)?.test;

            if (!test) {
                return;
            }

            if ([TestEvent.testSuiteStarted, TestEvent.testStarted].includes(result.event)) {
                run.appendOutput(`Running ${result.id}\r\n`);
                run.started(test);

                return;
            }

            if ([TestEvent.testSuiteFinished, TestEvent.testFinished].includes(result.event)) {
                run.passed(test);
            }

            if (
                cancellation.isCancellationRequested ||
                [TestEvent.testIgnored].includes(result.event)
            ) {
                run.skipped(test);
            }

            if ([TestEvent.testFailed].includes(result.event)) {
                const message = vscode.TestMessage.diff(
                    result.message,
                    result.expected!,
                    result.actual!
                );
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
                run.failed(test, message, result.duration);
            }

            const lineNo = test.range!.start.line;
            const fileCoverage = coveredLines.get(test.uri!.toString());
            if (fileCoverage) {
                fileCoverage[lineNo]!.executionCount++;
            }

            run.appendOutput(`Completed ${result.id}\r\n`);
        });

        testRunner.on(TestRunnerEvent.close, () => run.end());

        const runTestQueue = async () => {
            const options = { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath };

            if (request.include === undefined) {
                await testRunner.run(command.setArguments(''), options);

                return;
            }

            const promises = [];
            for (const test of request.include) {
                let filter = '';
                if (!test.canResolveChildren && test.parent?.uri) {
                    const deps = [test.label];
                    const testFile = testData.get(test.parent.uri.toString());
                    if (testFile) {
                        const t = testFile.tests
                            .reduce((acc, test) => {
                                acc.push(test);
                                if (test.children) {
                                    acc = acc.concat(test.children);
                                }
                                return acc;
                            }, [] as Test[])
                            .find((ttt) => ttt.method === test.label)!;
                        deps.push(...(t.annotations.depends ?? []));
                    }

                    filter = `^.*::(${deps.join('|')})( with data set .*)?$`;
                    filter = `--filter '${filter}'`;
                }

                const args = `${test.uri!.fsPath} ${filter}`;

                await testRunner.run(command.setArguments(args), options);
            }

            // for (const { test } of queue) {
            //     run.appendOutput(`Running ${test.id}\r\n`);
            //     if (cancellation.isCancellationRequested) {
            //         run.skipped(test);
            //     } else {
            //         run.started(test);
            //         await new Promise((resolve) =>
            //             setTimeout(resolve, 1000 + Math.random() * 1000)
            //         );
            //         run.passed(test);
            //     }

            //     const lineNo = test.range!.start.line;
            //     const fileCoverage = coveredLines.get(test.uri!.toString());
            //     if (fileCoverage) {
            //         fileCoverage[lineNo]!.executionCount++;
            //     }

            //     run.appendOutput(`Completed ${test.id}\r\n`);
            // }
        };
        run.coverageProvider = {
            provideFileCoverage() {
                const coverage: vscode.FileCoverage[] = [];
                for (const [uri, statements] of coveredLines) {
                    coverage.push(
                        vscode.FileCoverage.fromDetails(
                            vscode.Uri.parse(uri),
                            statements.filter((s): s is vscode.StatementCoverage => !!s)
                        )
                    );
                }

                return coverage;
            },
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

    const rawContent = textDecoder.decode(await vscode.workspace.fs.readFile(uri));
    const suites = parse(rawContent, uri.fsPath);

    if (!suites || suites.length === 0) {
        return;
    }

    const testItems = suites.map((suite: Test) => {
        const parent = controller.createTestItem(suite.id, suite.qualifiedClass, uri);
        controller.items.add(parent);

        parent.sortText = suite.id;
        parent.canResolveChildren = true;
        parent.range = new vscode.Range(
            new vscode.Position(suite.start.line - 1, suite.start.character),
            new vscode.Position(suite.end.line - 1, suite.end.character)
        );
        parent.children.replace(
            suite.children.map((test: Test, index) => {
                const child = controller.createTestItem(test.id, test.method!, uri);
                controller.items.add(child);

                child.sortText = `${index}`;
                child.canResolveChildren = false;
                child.range = new vscode.Range(
                    new vscode.Position(test.start.line - 1, test.start.character),
                    new vscode.Position(test.end.line - 1, test.end.character)
                );

                return child;
            })
        );

        return parent;
    });

    testData.set(uri.toString(), new TestFile(uri, suites, testItems));

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
                testFile.testItems.forEach((testItem) => controller.items.delete(testItem.id));
                testData.delete(id);
            }

            return getOrCreateFile(controller, uri);
        });

        watcher.onDidDelete((uri) => {
            const id = uri.toString();
            const testFile = testData.get(id);
            if (testFile) {
                testFile.testItems.forEach((testItem) => controller.items.delete(testItem.id));
                testData.delete(id);
            }
        });

        findInitialFiles(controller, pattern, exclude);

        return watcher;
    });
}
