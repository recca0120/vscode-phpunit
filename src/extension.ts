import {
    CancellationToken, EventEmitter, ExtensionContext, extensions, GlobPattern, languages, RelativePattern, TestItem,
    TestRunProfile, TestRunProfileKind, TestRunRequest, tests, Uri, window, workspace, WorkspaceFolder,
} from 'vscode';
import { PHPUnitFileCoverage } from './CloverParser';
import { CommandHandler } from './CommandHandler';
import { Configuration } from './Configuration';
import { Handler } from './Handler';
import { CollisionPrinter } from './Observers';
import { Pattern, PHPUnitXML } from './PHPUnit';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';

const phpUnitXML = new PHPUnitXML();
const printer = new CollisionPrinter(phpUnitXML);
let testCollection: TestCollection;

export async function activate(context: ExtensionContext) {
    const ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
    context.subscriptions.push(ctrl);
    testCollection = new TestCollection(ctrl, phpUnitXML);

    const outputChannel = window.createOutputChannel('PHPUnit', 'phpunit');
    context.subscriptions.push(outputChannel);

    context.subscriptions.push(languages.registerDocumentLinkProvider({ language: 'phpunit' }, new PHPUnitLinkProvider(phpUnitXML)));

    const configuration = new Configuration(workspace.getConfiguration('phpunit'));
    context.subscriptions.push(workspace.onDidChangeConfiguration(() => configuration.updateWorkspaceConfiguration(workspace.getConfiguration('phpunit'))));

    const configurationFile = await configuration.getConfigurationFile(workspace.workspaceFolders![0].uri.fsPath);
    if (configurationFile) {
        testCollection.reset();
        await phpUnitXML.loadFile(configurationFile);
    }

    await Promise.all(workspace.textDocuments.map((document) => testCollection.add(document.uri)));

    const reload = async () => {
        await Promise.all(
            (await getWorkspaceTestPatterns()).map(({ pattern, exclude }) => findInitialFiles(pattern, exclude)),
        );
    };

    context.subscriptions.push(
        workspace.onDidOpenTextDocument((document) => testCollection.add(document.uri)),
        workspace.onDidChangeTextDocument((e) => testCollection.change(e.document.uri)),
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

    const handler = new Handler(ctrl, phpUnitXML, configuration, testCollection, outputChannel, printer);

    const fileChangedEmitter = new EventEmitter<Uri>();
    const watchingTests = new Map<TestItem | 'ALL', TestRunProfile | undefined>();

    fileChangedEmitter.event(uri => {
        if (watchingTests.has('ALL')) {
            handler.startTestRun(new TestRunRequest(undefined, undefined, watchingTests.get('ALL'), true));
            return;
        }

        const include: TestItem[] = [];
        let profile: TestRunProfile | undefined;
        for (const [item, thisProfile] of watchingTests) {
            const cast = item as TestItem;
            if (cast.uri?.toString() === uri.toString()) {
                include.push(...testCollection.findTestsByFile(cast.uri!));
                profile = thisProfile;
            }
        }

        if (include.length) {
            handler.startTestRun(new TestRunRequest(include, undefined, profile, true));
        }
    });

    const runHandler = async (request: TestRunRequest, cancellation: CancellationToken) => {
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
    const testRunProfile = ctrl.createRunProfile('Run Tests', TestRunProfileKind.Run, runHandler, true, undefined, true);
    if (extensions.getExtension('xdebug.php-debug') !== undefined) {
        ctrl.createRunProfile('Debug Tests', TestRunProfileKind.Debug, runHandler, true, undefined, false);
    }
    const coverageProfile = ctrl.createRunProfile('Run with Coverage', TestRunProfileKind.Coverage, runHandler, true, undefined, false); // TODO Continuous
    coverageProfile.loadDetailedCoverage = async (_testRun, coverage) => {
        return (<PHPUnitFileCoverage>coverage).generateDetailedCoverage();
    };
    const commandHandler = new CommandHandler(testCollection, testRunProfile);

    context.subscriptions.push(commandHandler.reload(reload));
    context.subscriptions.push(commandHandler.runAll());
    context.subscriptions.push(commandHandler.runFile());
    context.subscriptions.push(commandHandler.runTestAtCursor());
    context.subscriptions.push(commandHandler.rerun(handler));
}

async function getWorkspaceTestPatterns() {
    if (!workspace.workspaceFolders) {
        return [];
    }

    const configuration = new Configuration(workspace.getConfiguration('phpunit'));

    return Promise.all(workspace.workspaceFolders.map(async (workspaceFolder: WorkspaceFolder) => {
        const configurationFile = await configuration.getConfigurationFile(workspaceFolder.uri.fsPath);
        configurationFile
            ? await phpUnitXML.loadFile(Uri.file(configurationFile).fsPath)
            : phpUnitXML.setRoot(workspaceFolder.uri.fsPath);
        const { includes, excludes } = phpUnitXML.getPatterns(workspaceFolder.uri.fsPath);

        const generateRelativePattern = (includeOrExclude: Pattern) => {
            const { uri, pattern } = includeOrExclude.toGlobPattern();

            return new RelativePattern(uri, pattern);
        };

        return {
            workspaceFolder,
            pattern: generateRelativePattern(includes),
            exclude: generateRelativePattern(excludes),
        };
    }));
}

async function findInitialFiles(pattern: GlobPattern, exclude: GlobPattern) {
    testCollection.reset();
    const files = await workspace.findFiles(pattern, exclude);
    await Promise.all(files.map((file) => testCollection.add(file)));
}

async function startWatchingWorkspace(fileChangedEmitter: EventEmitter<Uri>) {
    return Promise.all((await getWorkspaceTestPatterns()).map(async ({ pattern, exclude }) => {
        const watcher = workspace.createFileSystemWatcher(pattern);

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

        await findInitialFiles(pattern, exclude);

        return watcher;
    }));
}