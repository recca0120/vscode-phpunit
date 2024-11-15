import {
    CancellationToken,
    EventEmitter,
    OutputChannel,
    TestController,
    TestItem,
    TestRun,
    TestRunRequest,
    Uri,
} from 'vscode';
import { Configuration } from './Configuration';
import { OutputChannelObserver, TestResultObserver } from './Observers';
import { LocalCommand, RemoteCommand, TestRunner } from './PHPUnit';
import { TestCollection } from './TestCollection';
import { TestQueueHandler } from './TestQueueHandler';

export class Handler {
    private latestTestRunRequest: TestRunRequest | undefined;

    constructor(
        private testCollection: TestCollection,
        private configuration: Configuration,
        private outputChannel: OutputChannel,
        private ctrl: TestController,
        private fileChangedEmitter: EventEmitter<Uri>,
    ) {
    }

    getLatestTestRunRequest() {
        return this.latestTestRunRequest;
    }

    async run(request: TestRunRequest, cancellation: CancellationToken) {
        if (!request.continuous) {
            return this.startTestRun(request, cancellation);
        }

        const l = this.fileChangedEmitter.event(async (uri) => {
            await this.testCollection.add(uri);

            const testRunRequest = new TestRunRequest(request.include ?? [], undefined, request.profile, true);
            await this.startTestRun(testRunRequest, cancellation);
        });
        cancellation.onCancellationRequested(() => l.dispose());
    }

    private async startTestRun(request: TestRunRequest, cancellation: CancellationToken) {
        const command = await this.createCommand();
        if (!command) {
            return;
        }

        this.latestTestRunRequest = request;
        const run = this.ctrl.createTestRun(request);
        const queueHandler = new TestQueueHandler(this.testCollection, request, run);
        const runner = this.createTestRunner(queueHandler, run, request, cancellation);

        await queueHandler.discoverTests(request.include ?? this.gatherTestItems());
        await queueHandler.runQueue(runner, command);
    }

    private* gatherTestItems(): Generator<TestItem> {
        for (const item of this.testCollection.gatherTestDefinitions()) {
            yield item.testItem;
        }
    }

    private async createCommand() {
        const options = { cwd: this.testCollection.getWorkspace() };

        return this.isRemote() ? new RemoteCommand(this.configuration, options) : new LocalCommand(this.configuration, options);
    }

    private isRemote() {
        const command = (this.configuration.get('command') as string) ?? '';

        return command.match(/docker|ssh|sail/) !== null;
    }

    private createTestRunner(
        queueHandler: TestQueueHandler,
        run: TestRun,
        request: TestRunRequest,
        cancellation: CancellationToken,
    ) {
        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queueHandler.queue, run, cancellation));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, request));

        return runner;
    }
}