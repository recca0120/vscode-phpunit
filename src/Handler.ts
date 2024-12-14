import * as vscode from 'vscode';
import {
    CancellationToken,
    debug,
    OutputChannel,
    TestController,
    TestItem,
    TestItemCollection,
    TestRunProfileKind,
    TestRunRequest,
} from 'vscode';
import { Configuration } from './Configuration';
import { CollisionPrinter, OutputChannelObserver, TestResultObserver } from './Observers';
import { CommandBuilder, TestRunner, TestType } from './PHPUnit';
import { TestCase, TestCollection } from './TestCollection';

export class Handler {
    private lastRequest: TestRunRequest | undefined;

    constructor(private ctrl: TestController, private configuration: Configuration, private testCollection: TestCollection, private outputChannel: OutputChannel) { }

    getLastRequest() {
        return this.lastRequest;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const queue: { test: TestItem; data: TestCase }[] = [];
        const run = this.ctrl.createTestRun(request);
        const runner = new TestRunner();

        runner.observe(new TestResultObserver(queue, run, cancellation));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, request, new CollisionPrinter()));

        const builder = new CommandBuilder(this.configuration, { cwd: this.testCollection.getWorkspace().fsPath });
        if (request.profile?.kind === TestRunProfileKind.Debug) {
            builder.setExtra(['-dxdebug.mode=debug', '-dxdebug.start_with_request=1']);
        }

        const discoverTests = async (tests: Iterable<TestItem>) => {
            for (const test of tests) {
                if (request.exclude?.includes(test)) {
                    continue;
                }

                const data = this.testCollection.getTestCase(test);
                if (data?.type === TestType.method) {
                    run.enqueued(test);
                    queue.push({ test, data });
                } else {
                    await discoverTests(this.gatherTestItems(test.children));
                }
            }
        };

        const runTestQueue = async () => {

            const processes = !request.include
                ? [runner.run(builder)]
                : request.include
                    .map((test) => this.testCollection.getTestCase(test)!)
                    .map((testCase) => runner.run(testCase.update(builder)));

            cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

            if (request.profile?.kind === TestRunProfileKind.Debug) {
                const wsf = vscode.workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
                await debug.startDebugging(wsf, { type: 'php', request: 'launch', name: 'PHPUnit' });
                // TODO: perhaps wait for the debug session
            }

            while (processes.length > 0) {
                await processes.shift()?.run();
            }

            if (request.profile?.kind === TestRunProfileKind.Debug && debug.activeDebugSession && debug.activeDebugSession.type === 'php') {
                debug.stopDebugging(vscode.debug.activeDebugSession);
            }

            run.end();
            return;
        };

        await discoverTests(request.include ?? this.gatherTestItems(this.ctrl.items)).then(runTestQueue);
        this.lastRequest = request;
    }

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }
}