import {
    CancellationToken,
    OutputChannel,
    TestController,
    TestItem,
    TestItemCollection,
    TestRun,
    TestRunRequest,
    window,
    workspace,
} from 'vscode';
import { TestFile } from './test-file';
import { Configuration } from './configuration';
import { LocalCommand, RemoteCommand } from './phpunit/command';
import { TestRunner } from './phpunit/test-runner';
import { OutputChannelObserver, TestResultObserver } from './observers';

export class Handler {
    private latestTestRunRequest: TestRunRequest | undefined;

    constructor(
        private testData: Map<string, TestFile>,
        private configuration: Configuration,
        private outputChannel: OutputChannel,
        private ctrl: TestController
    ) {}

    getLatestTestRunRequest() {
        return this.latestTestRunRequest;
    }

    async run(request: TestRunRequest, cancellation: CancellationToken) {
        this.latestTestRunRequest = request;

        const run = this.ctrl.createTestRun(request);
        const queueHandler = new TestQueueHandler(request, run);

        return queueHandler
            .discoverTests(request.include ?? gatherTestItems(this.ctrl.items))
            .then(() =>
                queueHandler.runQueue(
                    cancellation,
                    this.configuration,
                    this.outputChannel,
                    this.testData
                )
            );
    }
}

class TestQueueHandler {
    public queue: { test: TestItem }[] = [];

    constructor(private request: TestRunRequest, private run: TestRun) {}

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

    public async runQueue(
        cancellation: CancellationToken,
        configuration: Configuration,
        outputChannel: OutputChannel,
        testData: Map<string, TestFile>
    ) {
        const currentWorkspaceFolder = await getCurrentWorkspaceFolder();

        if (!currentWorkspaceFolder) {
            this.run.end();
            return;
        }

        const options = { cwd: currentWorkspaceFolder.uri.fsPath };

        const command = ((configuration.get('command') as string) ?? '').match(/docker|ssh/)
            ? new RemoteCommand(configuration, options)
            : new LocalCommand(configuration, options);

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(this.queue, this.run, cancellation));
        runner.observe(new OutputChannelObserver(outputChannel, configuration));

        if (!this.request.include) {
            await runner.run(command);

            return;
        }

        const getArguments = (test: TestItem) => {
            return !test.parent
                ? test.uri!.fsPath
                : testData.get(test.parent.uri!.toString())!.getArguments(test.id);
        };

        await Promise.all(
            this.request.include.map((test) => runner.run(command.setArguments(getArguments(test))))
        );
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
