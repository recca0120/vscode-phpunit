import { dirname, relative } from 'node:path';
import * as vscode from 'vscode';
import { CommandHandler } from './CommandHandler';
import { Configuration } from './Configuration';
import { Handler } from './Handler';
import { PHPUnitXML } from './PHPUnit';
import { TestCollection } from './TestCollection';

const phpUnitXML = new PHPUnitXML();
let testCollection: TestCollection;

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
            await phpUnitXML.loadFile(vscode.Uri.file(configurationFile).fsPath);
            const baseDir = directoryPath(dirname(relative(workspaceFolder.uri.fsPath, configurationFile)));

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
            testCollection.change(uri);
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
        vscode.workspace.onDidChangeConfiguration(() => configuration.updateWorkspaceConfiguration(vscode.workspace.getConfiguration('phpunit'))),
    );

    const outputChannel = vscode.window.createOutputChannel('PHPUnit');
    context.subscriptions.push(outputChannel);

    const ctrl = vscode.tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);

    const configurationFile = await configuration.getConfigurationFile(vscode.workspace.workspaceFolders![0].uri.fsPath);
    if (configurationFile) {
        await phpUnitXML.loadFile(configurationFile);
    }
    testCollection = new TestCollection(ctrl, phpUnitXML);

    testCollection.reset();
    await Promise.all(vscode.workspace.textDocuments.map((document) => testCollection.add(document.uri)));

    const reload = async () => {
        await Promise.all(
            (await getWorkspaceTestPatterns()).map(({ pattern, exclude }) => findInitialFiles(pattern, exclude)),
        );
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => testCollection.add(document.uri)),
        vscode.workspace.onDidChangeTextDocument((e) => testCollection.add(e.document.uri)),
    );

    ctrl.refreshHandler = reload;
    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...(await startWatchingWorkspace(fileChangedEmitter)));
            return;
        }

        if (item.uri) {
            await testCollection.add(item.uri);
        }
    };

    const handler = new Handler(ctrl, configuration, testCollection, outputChannel);

    const fileChangedEmitter = new vscode.EventEmitter<vscode.Uri>();
    const watchingTests = new Map<vscode.TestItem | 'ALL', vscode.TestRunProfile | undefined>();

    fileChangedEmitter.event(uri => {
        if (watchingTests.has('ALL')) {
            handler.startTestRun(new vscode.TestRunRequest(undefined, undefined, watchingTests.get('ALL'), true));
            return;
        }

        const include: vscode.TestItem[] = [];
        let profile: vscode.TestRunProfile | undefined;
        for (const [item, thisProfile] of watchingTests) {
            const cast = item as vscode.TestItem;
            if (cast.uri?.toString() === uri.toString()) {
                include.push(cast);
                profile = thisProfile;
            }
        }

        if (include.length) {
            handler.startTestRun(new vscode.TestRunRequest(include, undefined, profile, true));
        }
    });

    const runHandler = async (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
        if (!request.continuous) {
            return handler.startTestRun(request, cancellation);
        }

        if (request.include === undefined) {
            watchingTests.set('ALL', request.profile);
            cancellation.onCancellationRequested(() => watchingTests.delete('ALL'));
        } else {
            request.include.forEach(item => watchingTests.set(item, request.profile));
            cancellation.onCancellationRequested(() => request.include!.forEach(item => watchingTests.delete(item)));
        }
    };
    const testRunProfile = ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true, undefined, true);
    const commandHandler = new CommandHandler(testCollection, testRunProfile);

    context.subscriptions.push(commandHandler.reload(reload));
    context.subscriptions.push(commandHandler.runAll());
    context.subscriptions.push(commandHandler.runFile());
    context.subscriptions.push(commandHandler.runTestAtCursor());
    context.subscriptions.push(commandHandler.rerun(handler));
}
