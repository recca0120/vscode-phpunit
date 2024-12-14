import * as vscode from 'vscode';
import {
    CancellationToken,
    debug,
    OutputChannel,
    TestController,
    TestItem,
    TestItemCollection,
    TestRun,
    TestRunProfileKind,
    TestRunRequest,
} from 'vscode';
import { Configuration } from './Configuration';
import { CollisionPrinter, OutputChannelObserver, TestResultObserver } from './Observers';
import { CommandBuilder, TestRunner, TestType } from './PHPUnit';
import { TestCollection } from './TestCollection';
import { Queue } from './types';

export class Handler {
    private lastRequest: TestRunRequest | undefined;
    private printer = new CollisionPrinter();

    constructor(private ctrl: TestController, private configuration: Configuration, private testCollection: TestCollection, private outputChannel: OutputChannel) { }

    getLastRequest() {
        return this.lastRequest;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const run = this.ctrl.createTestRun(request);

        const command = new CommandBuilder(this.configuration, { cwd: this.testCollection.getWorkspace().fsPath });
        if (request.profile?.kind === TestRunProfileKind.Debug) {
            command.setExtra(['-dxdebug.mode=debug', '-dxdebug.start_with_request=1']);

            const wsf = vscode.workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
            await debug.startDebugging(wsf, { type: 'php', request: 'launch', name: 'PHPUnit' });
            // TODO: perhaps wait for the debug session
        }

        await this.runTestQueue(command, run, request, cancellation);

        if (request.profile?.kind === TestRunProfileKind.Debug && debug.activeDebugSession?.type === 'php') {
            debug.stopDebugging(vscode.debug.activeDebugSession);
        }

        this.lastRequest = request;
    }

    private async runTestQueue(command: CommandBuilder, testRun: TestRun, request: TestRunRequest, cancellation?: CancellationToken) {
        const queue = await this.discoverTests(testRun, request, request.include ?? this.gatherTestItems(this.ctrl.items));

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, request, this.printer));

        const processes = !request.include
            ? [runner.run(command)]
            : request.include
                .map((test) => this.testCollection.getTestCase(test)!)
                .map((testCase) => runner.run(testCase.update(command)));

        cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

        await Promise.all(processes.map((process) => process.run()));

        testRun.end();
    };

    private async discoverTests(run: TestRun, request: TestRunRequest, tests: Iterable<TestItem>, queue: Queue[] = []) {
        for (const test of tests) {
            if (request.exclude?.includes(test)) {
                continue;
            }

            const data = this.testCollection.getTestCase(test);
            if (data?.type === TestType.method) {
                run.enqueued(test);
                queue.push({ test, data });
            } else {
                await this.discoverTests(run, request, this.gatherTestItems(test.children), queue);
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