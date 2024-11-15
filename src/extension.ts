import * as path from 'node:path';
import * as vscode from 'vscode';
import { CancellationToken, TestRunProfileKind, TestRunRequest, Uri } from 'vscode';
import { CommandHandler } from './CommandHandler';
import { Configuration } from './Configuration';
import { Handler } from './Handler';
import { PHPUnitXML, TestParser } from './PHPUnit';
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

    const runHandler = (testRunRequest: TestRunRequest, cancellation: CancellationToken) => handler.run(testRunRequest, cancellation);
    const testRunProfile = ctrl.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true, undefined, true);
    const commandHandler = new CommandHandler(testCollection, testRunProfile);
    context.subscriptions.push(vscode.commands.registerCommand('PHPUnit.reload', reload));
    context.subscriptions.push(commandHandler.runAll());
    context.subscriptions.push(commandHandler.runFile());
    context.subscriptions.push(commandHandler.runTestAtCursor());
    context.subscriptions.push(commandHandler.rerun(handler));
}
