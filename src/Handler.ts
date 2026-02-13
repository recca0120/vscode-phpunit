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
import { ProcessBuilder, PHPUnitXML, TestRunner, TestRunnerEvent, TestType } from './PHPUnit';
import { Mode, Xdebug } from './PHPUnit/ProcessBuilder/Xdebug';
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
        const builder = new ProcessBuilder(this.configuration, { cwd: this.phpUnitXML.root() });

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

    async startGroupTestRun(group: string, cancellation?: CancellationToken) {
        const builder = new ProcessBuilder(this.configuration, { cwd: this.phpUnitXML.root() });
        builder.setArguments(`--group ${group}`);

        const request = new TestRunRequest();
        const testRun = this.ctrl.createTestRun(request);

        const runner = new TestRunner();
        const queue = await this.discoverTests(this.gatherTestItems(this.ctrl.items), request);
        queue.forEach((testItem) => testRun.enqueued(testItem));

        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, this.printer, request));
        runner.observe(new MessageObserver(this.configuration));

        runner.emit(TestRunnerEvent.start, undefined);

        const process = runner.run(builder);
        cancellation?.onCancellationRequested(() => process.abort());

        await process.run();
        runner.emit(TestRunnerEvent.done, undefined);
        testRun.end();
    }

    private async runTestQueue(builder: ProcessBuilder, testRun: TestRun, request: TestRunRequest, cancellation?: CancellationToken) {
        const queue = await this.discoverTests(request.include ?? this.gatherTestItems(this.ctrl.items), request);
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = this.createTestRunner(queue, testRun, request);
        runner.emit(TestRunnerEvent.start, undefined);

        const processes = this.createProcesses(runner, builder, request);
        cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

        await Promise.all(processes.map((process) => process.run()));
        await this.collectCoverage(processes, testRun);

        runner.emit(TestRunnerEvent.done, undefined);
    };

    private createTestRunner(queue: Map<TestCase, TestItem>, testRun: TestRun, request: TestRunRequest) {
        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, this.printer, request));
        runner.observe(new MessageObserver(this.configuration));

        return runner;
    }

    private createProcesses(runner: TestRunner, builder: ProcessBuilder, request: TestRunRequest) {
        if (!request.include) {
            return [runner.run(builder)];
        }

        return request.include
            .map((testItem) => this.testCollection.getTestCase(testItem)!)
            .map((testCase, index) => testCase.update(builder, index))
            .map((builder) => runner.run(builder));
    }

    private async collectCoverage(processes: ReturnType<TestRunner['run']>[], testRun: TestRun) {
        const cloverFiles = processes
            .map((process) => process.getCloverFile())
            .filter((file): file is string => !!file);

        await Promise.all(
            cloverFiles.map(async (file) => {
                (await CloverParser.parseClover(file)).forEach(coverage => {
                    testRun.addCoverage(coverage);
                });
            }),
        );

        if (cloverFiles.length > 0) {
            await rm(dirname(cloverFiles[0]), { recursive: true, force: true });
        }
    }

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
