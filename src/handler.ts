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
        const queue: { test: TestItem }[] = [];

        return this.discoverTests(
            request.include ?? this.gatherTestItems(this.ctrl.items),
            request,
            run,
            queue
        ).then(async () => await this.runTestQueue(request, run, queue, cancellation));
    }

    private async runTestQueue(
        request: TestRunRequest,
        run: TestRun,
        queue: { test: TestItem }[],
        cancellation: CancellationToken
    ) {
        const currentWorkspaceFolder = await this.getCurrentWorkspaceFolder();
        if (!currentWorkspaceFolder) {
            run.end();
            return;
        }

        const options = { cwd: currentWorkspaceFolder.uri.fsPath };

        const command = ((this.configuration.get('command') as string) ?? '').match(/docker|ssh/)
            ? new RemoteCommand(this.configuration, options)
            : new LocalCommand(this.configuration, options);

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, run, cancellation));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration));

        if (!request.include) {
            await runner.run(command);

            return;
        }

        const getArguments = (test: TestItem) => {
            return !test.parent
                ? test.uri!.fsPath
                : this.testData.get(test.parent.uri!.toString())!.getArguments(test.id);
        };

        await Promise.all(
            request.include.map((test) => runner.run(command.setArguments(getArguments(test))))
        );
    }

    private async discoverTests(
        tests: Iterable<TestItem>,
        request: TestRunRequest,
        run: TestRun,
        queue: { test: TestItem }[]
    ) {
        for (const test of tests) {
            if (request.exclude?.includes(test)) {
                continue;
            }

            if (!test.canResolveChildren) {
                run.enqueued(test);
                queue.push({ test });
            } else {
                await this.discoverTests(this.gatherTestItems(test.children), request, run, queue);
            }
        }
    }

    private async getCurrentWorkspaceFolder() {
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

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));
        return items;
    }
}
