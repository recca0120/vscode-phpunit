import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { TestFile } from './test-file';
import { Handler } from './handler';
import { CommandHandler } from './command-handler';
import { parseXML } from './phpunit/phpunit-xml-parser/parser';
import * as fs from 'node:fs';

const testData = new Map<string, TestFile>();

export async function activate(context: vscode.ExtensionContext) {
    const configuration = new Configuration(vscode.workspace.getConfiguration('phpunit'));
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(() =>
            configuration.updateWorkspaceConfiguration(vscode.workspace.getConfiguration('phpunit')),
        ),
    );

    const outputChannel = vscode.window.createOutputChannel('PHPUnit');
    context.subscriptions.push(outputChannel);

    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);

    const fileChangedEmitter = new vscode.EventEmitter<vscode.Uri>();
    const handler = new Handler(
        testData,
        configuration,
        outputChannel,
        ctrl,
        fileChangedEmitter,
        getOrCreateFile,
    );

    ctrl.refreshHandler = async () => {
        await Promise.all(
            getWorkspaceTestPatterns().map(({ pattern, exclude }) =>
                findInitialFiles(ctrl, pattern, exclude),
            ),
        );
    };

    const testRunProfile = ctrl.createRunProfile(
        'Run Tests',
        vscode.TestRunProfileKind.Run,
        (request, cancellation) => handler.run(request, cancellation),
        true,
        undefined,
        true,
    );

    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...startWatchingWorkspace(ctrl, fileChangedEmitter));
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
        vscode.workspace.textDocuments.map((document) => updateNodeForDocument(document)),
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
        vscode.workspace.onDidChangeTextDocument((e) => updateNodeForDocument(e.document)),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('phpunit.reload', async () => {
            await Promise.all(
                getWorkspaceTestPatterns().map(({ pattern, exclude }) =>
                    findInitialFiles(ctrl, pattern, exclude),
                ),
            );
        }),
    );

    const commandHandler = new CommandHandler(testRunProfile, testData);
    context.subscriptions.push(commandHandler.runAll());
    context.subscriptions.push(commandHandler.runFile());
    context.subscriptions.push(commandHandler.runTestAtCursor());
    context.subscriptions.push(commandHandler.rerun(handler));
}

export async function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) {
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

    const trimPath = (path: string) => path.replace(/[\\|\/]+$/, '');
    const results = [];
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        const includePatterns = [];
        const excludePatterns = ['**/.git/**', '**/node_modules/**'];

        const path = ['phpunit.xml', 'phpunit.dist.xml']
            .map((path) => workspaceFolder.uri.fsPath + '/' + path)
            .find((path) => fs.existsSync(path));

        if (path) {
            const xml = parseXML(path);
            for (const item of xml.getTestSuites()) {
                if (item.tagName === 'directory') {
                    includePatterns.push(`${trimPath(item.value)}/**/*.php`);
                } else if (item.tagName === 'file') {
                    includePatterns.push(item.value);
                } else if (item.tagName === 'exclude') {
                    excludePatterns.push(item.value);
                }
            }

            for (const item of xml.getIncludes()) {
                if (item.tagName === 'directory') {
                    const suffix = item.suffix ? `*${item.suffix}` : '*.php';
                    includePatterns.push(`${trimPath(item.value)}/**/${suffix}`);
                } else if (item.tagName === 'file') {
                    includePatterns.push(item.value);
                }
            }

            for (const item of xml.getExcludes()) {
                if (item.tagName === 'directory') {
                    const suffix = item.suffix ? `*${item.suffix}` : '*.php';
                    excludePatterns.push(`${trimPath(item.value)}/**/${suffix}`);
                } else if (item.tagName === 'file') {
                    excludePatterns.push(item.value);
                }
            }
        }

        if (includePatterns.length === 0) {
            includePatterns.push('tests/**/*.php');
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
    controller: vscode.TestController,
    pattern: vscode.GlobPattern,
    exclude: vscode.GlobPattern,
) {
    testData.clear();
    controller.items.forEach((item) => controller.items.delete(item.id));
    await vscode.workspace.findFiles(pattern, exclude).then((files) => {
        return Promise.all(files.map((file) => getOrCreateFile(controller, file)));
    });
}

function startWatchingWorkspace(controller: vscode.TestController, fileChangedEmitter: vscode.EventEmitter<vscode.Uri>) {
    return getWorkspaceTestPatterns().map(({ pattern, exclude }) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate((uri) => {
            getOrCreateFile(controller, uri);
            fileChangedEmitter.fire(uri);
        });

        watcher.onDidChange((uri) => {
            const id = uri.toString();
            const testFile = testData.get(id);
            if (testFile) {
                testFile.delete(controller);
                testData.delete(id);
            }
            getOrCreateFile(controller, uri);
            fileChangedEmitter.fire(uri);
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
