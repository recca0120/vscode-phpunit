import * as vscode from 'vscode';
import { getContentFromFilesystem, TestCase, testData, TestFile } from './testTree';
import { parse, Test } from './phpunit/parser';

const textDecoder = new TextDecoder('utf-8');

export async function activate(context: vscode.ExtensionContext) {
    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);

    const runHandler = (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
        const queue: { test: vscode.TestItem; data: TestCase }[] = [];
        const run = ctrl.createTestRun(request);
        // map of file uris to statements on each line:
        const coveredLines = new Map<
            /* file uri */ string,
            (vscode.StatementCoverage | undefined)[]
        >();

        const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
            for (const test of tests) {
                if (request.exclude?.includes(test)) {
                    continue;
                }

                const data = testData.get(test);
                if (data instanceof TestCase) {
                    run.enqueued(test);
                    queue.push({ test, data });
                } else {
                    if (data instanceof TestFile && !data.didResolve) {
                        await data.updateFromDisk(ctrl, test);
                    }

                    await discoverTests(gatherTestItems(test.children));
                }

                if (test.uri && !coveredLines.has(test.uri.toString())) {
                    try {
                        const lines = (await getContentFromFilesystem(test.uri)).split('\n');
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

        const runTestQueue = async () => {
            for (const { test, data } of queue) {
                run.appendOutput(`Running ${test.id}\r\n`);
                if (cancellation.isCancellationRequested) {
                    run.skipped(test);
                } else {
                    run.started(test);
                    await data.run(test, run);
                }

                const lineNo = test.range!.start.line;
                const fileCoverage = coveredLines.get(test.uri!.toString());
                if (fileCoverage) {
                    fileCoverage[lineNo]!.executionCount++;
                }

                run.appendOutput(`Completed ${test.id}\r\n`);
            }

            run.end();
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

        discoverTests(request.include ?? gatherTestItems(ctrl.items)).then(runTestQueue);
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
            return;
        }

        const data = testData.get(item);
        if (data instanceof TestFile) {
            await data.updateFromDisk(ctrl, item);
        }
    };

    async function updateNodeForDocument(e: vscode.TextDocument) {
        if (e.uri.scheme !== 'file') {
            return;
        }

        if (!e.uri.path.endsWith('.php')) {
            return;
        }

        const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(e.uri);
        const workspaceTestPattern = getWorkspaceTestPatterns().find(({ workspaceFolder }) => {
            return currentWorkspaceFolder!.name === workspaceFolder.name;
        });

        if (
            !workspaceTestPattern ||
            vscode.languages.match({ pattern: workspaceTestPattern.exclude.pattern }, e) !== 0
        ) {
            return;
        }

        await getOrCreateFile(ctrl, e.uri);
    }

    await Promise.all(
        vscode.workspace.textDocuments.map((document) => updateNodeForDocument(document))
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
        vscode.workspace.onDidChangeTextDocument((e) => updateNodeForDocument(e.document))
    );
}

async function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) {
    // const existing = controller.items.get(uri.toString());
    // if (existing) {
    //     return { file: existing, data: testData.get(existing) as TestFile };
    // }

    const contents = textDecoder.decode(await vscode.workspace.fs.readFile(uri));
    const suites = parse(contents, uri.fsPath)?.map((suite: Test) => {
        const parent = controller.createTestItem(suite.id, suite.qualifiedClass, uri);
        parent.canResolveChildren = true;
        parent.children.replace(
            suite.children.map((test: Test, index) => {
                const children = controller.createTestItem(test.id, test.method!, uri);
                children.canResolveChildren = false;
                children.sortText = `${index}`;
                children.range = new vscode.Range(
                    new vscode.Position(test.start.line - 1, test.start.character),
                    new vscode.Position(test.end.line - 1, test.end.character)
                );

                return children;
            })
        );

        return parent;
    });

    suites?.forEach((suite) => controller.items.add(suite));

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
    await vscode.workspace.findFiles(pattern, exclude).then((files) => {
        return Promise.all(files.map((file) => getOrCreateFile(controller, file)));
    });
}

function startWatchingWorkspace(controller: vscode.TestController) {
    return getWorkspaceTestPatterns().map(({ pattern, exclude }) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate((uri) => getOrCreateFile(controller, uri));
        watcher.onDidChange((uri) => getOrCreateFile(controller, uri));
        watcher.onDidDelete((uri) => controller.items.delete(uri.toString()));

        findInitialFiles(controller, pattern, exclude);

        return watcher;
    });
}
