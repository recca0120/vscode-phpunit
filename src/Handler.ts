import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
    CancellationToken, debug, OutputChannel, TestController, TestItem, TestItemCollection, TestRun, TestRunRequest,
    workspace,
} from 'vscode';
import { CloverParser } from './CloverParser';
import { Configuration } from './Configuration';
import { OutputChannelObserver, Printer, TestResultObserver } from './Observers';
import { MessageObserver } from './Observers/MessageObserver';
import { Builder, PHPUnitXML, TestRunner, TestRunnerEvent, TestType } from './PHPUnit';
import { Mode, Xdebug } from './PHPUnit/CommandBuilder/Xdebug';
import { TestCase, TestCollection } from './TestCollection';

export class Handler {
    private previousRequest: TestRunRequest | undefined;

    constructor(
        private ctrl: TestController,
        private phpUnitXML: PHPUnitXML,
        private configuration: Configuration,
        private testCollection: TestCollection,
        private outputChannel: OutputChannel,
        private printer: Printer,
    ) { }

    getPreviousRequest() {
        return this.previousRequest;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const wsf = workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
        const builder = new Builder(this.configuration, { cwd: this.phpUnitXML.root() });

        const xdebug = new Xdebug(this.configuration);
        builder.setXdebug(xdebug);

        await xdebug.setMode(request.profile?.kind);
        if (xdebug.mode === Mode.debug) {
            // TODO: perhaps wait for the debug session
            await debug.startDebugging(wsf, xdebug.name ?? await xdebug.getDebugConfiguration());
        }

        const testRun = this.ctrl.createTestRun(request);
        await this.runTestQueue(builder, testRun, request, cancellation);

        if (xdebug.mode === Mode.debug && debug.activeDebugSession?.type === 'php') {
            debug.stopDebugging(debug.activeDebugSession);
        }

        this.previousRequest = request;
    }

    private async runTestQueue(builder: Builder, testRun: TestRun, request: TestRunRequest, cancellation?: CancellationToken) {
        const queue = await this.discoverTests(request.include ?? this.gatherTestItems(this.ctrl.items), request);
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, this.printer, request));
        runner.observe(new MessageObserver(this.configuration));

        runner.emit(TestRunnerEvent.start, undefined);

        const processes = !request.include
            ? [runner.run(builder)]
            : request.include
                .map((testItem) => this.testCollection.getTestCase(testItem)!)
                .map((testCase, index) => testCase.update(builder, index))
                .map((builder) => runner.run(builder));

        cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

        await Promise.all(processes.map((process) => process.run()));

        await Promise.all(
            processes
                .map((process) => process.getCloverFile())
                .filter((file) => !!file)
                .map(async (file) => {
                    return (await CloverParser.parseClover(file!)).map(coverage => {
                        testRun.addCoverage(coverage);
                    });
                }),
        );

        const cloverFile = processes[0].getCloverFile();
        if (cloverFile) {
            await rm(dirname(cloverFile), { recursive: true, force: true });
        }

        runner.emit(TestRunnerEvent.done, undefined);
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