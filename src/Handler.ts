import {
    CancellationToken, debug, OutputChannel, TestController, TestItem, TestItemCollection, TestRun, TestRunProfileKind,
    TestRunRequest, workspace,
} from 'vscode';
import { Configuration } from './Configuration';
import { CollisionPrinter, OutputChannelObserver, TestResultObserver } from './Observers';
import { MessageObserver } from './Observers/MessageObserver';
import { CommandBuilder, TestRunner, TestType } from './PHPUnit';
import { TestCase, TestCollection } from './TestCollection';

export class Handler {
    private previousRequest: TestRunRequest | undefined;
    private printer = new CollisionPrinter();

    constructor(private ctrl: TestController, private configuration: Configuration, private testCollection: TestCollection, private outputChannel: OutputChannel) { }

    getPreviousRequest() {
        return this.previousRequest;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const command = new CommandBuilder(this.configuration, { cwd: this.testCollection.getWorkspace().fsPath });
        if (request.profile?.kind === TestRunProfileKind.Debug) {
            command.setExtra(['-dxdebug.mode=debug', '-dxdebug.start_with_request=1']);

            const wsf = workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
            await debug.startDebugging(wsf, { type: 'php', request: 'launch', name: 'PHPUnit' });
            // TODO: perhaps wait for the debug session
        }

        const testRun = this.ctrl.createTestRun(request);
        await this.runTestQueue(command, testRun, request, cancellation);

        if (request.profile?.kind === TestRunProfileKind.Debug && debug.activeDebugSession?.type === 'php') {
            debug.stopDebugging(debug.activeDebugSession);
        }

        this.previousRequest = request;
    }

    private async runTestQueue(command: CommandBuilder, testRun: TestRun, request: TestRunRequest, cancellation?: CancellationToken) {
        const queue = await this.discoverTests(request.include ?? this.gatherTestItems(this.ctrl.items), request);
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, request, this.printer));
        runner.observe(new MessageObserver(this.configuration));

        const processes = !request.include
            ? [runner.run(command)]
            : request.include
                .map((testItem) => this.testCollection.getTestCase(testItem)!)
                .map((testCase) => runner.run(testCase.update(command)));

        cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

        await Promise.all(processes.map((process) => process.run()));

        testRun.end();
    };

    private async discoverTests(tests: Iterable<TestItem>, request: TestRunRequest, queue = new Map<TestCase, TestItem>()) {
        for (const testItem of tests) {
            if (request.exclude?.includes(testItem)) {
                continue;
            }

            const testCase = this.testCollection.getTestCase(testItem);
            if (testCase?.type === TestType.method) {
                queue.set(testCase, testItem);
            } else {
                await this.discoverTests(this.gatherTestItems(testItem.children), request, queue);
            }
        }

        return queue;
    };

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }
}