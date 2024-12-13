import {
    CancellationToken,
    OutputChannel,
    TestController,
    TestItem,
    TestItemCollection,
    TestRunRequest,
    TestRunProfileKind,
} from 'vscode';
import * as vscode from 'vscode';
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
        const builder = new CommandBuilder(this.configuration, { cwd: this.testCollection.getWorkspace().fsPath }, request.profile?.kind);
        const queue: { test: TestItem; data: TestCase }[] = [];
        const run = this.ctrl.createTestRun(request);

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
            const runner = new TestRunner();
            runner.observe(new TestResultObserver(queue, run, cancellation));
            runner.observe(new OutputChannelObserver(
                this.outputChannel,
                this.configuration,
                request,
                new CollisionPrinter(),
            ));

            const processes = !request.include
                ? [runner.run(builder)]
                : request.include
                    .map((test) => {
                        const testCase = this.testCollection.getTestCase(test)!
                        const builder = new CommandBuilder(this.configuration, { cwd: this.testCollection.getWorkspace().fsPath }, request.profile?.kind);
                        return runner.run(testCase.update(builder))
                    });
            cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

            if (request.profile?.kind == TestRunProfileKind.Debug) {
                const wsf = vscode.workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
                await vscode.debug.startDebugging(wsf, { type: 'php', request: 'launch', name: 'PHPUnit' });
                // TODO: perhaps wait for the debug session
            }

            await Promise.all(processes.map((process) => process.run()));

            if (request.profile?.kind == TestRunProfileKind.Debug && vscode.debug.activeDebugSession && vscode.debug.activeDebugSession.type === 'php') {
                vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
            }

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