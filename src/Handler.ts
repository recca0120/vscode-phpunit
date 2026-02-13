import {
    CancellationToken, debug, TestController, TestItem, TestRun, TestRunRequest,
    workspace,
} from 'vscode';
import { CoverageCollector } from './CoverageCollector';
import { Configuration } from './Configuration';
import { ProcessBuilder, PHPUnitXML, TestRunner, TestRunnerEvent } from './PHPUnit';
import { Mode, Xdebug } from './PHPUnit/ProcessBuilder/Xdebug';
import { TestCollection } from './TestCollection';
import { TestDiscovery } from './TestDiscovery';
import { TestRunnerFactory } from './TestRunnerFactory';

export class Handler {
    private previousRequest: TestRunRequest | undefined;

    constructor(
        private ctrl: TestController,
        private phpUnitXML: PHPUnitXML,
        private configuration: Configuration,
        private testCollection: TestCollection,
        private testRunnerFactory: TestRunnerFactory,
        private coverageCollector: CoverageCollector,
        private testDiscovery: TestDiscovery,
    ) {}

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

        const queue = await this.testDiscovery.discover(
            this.testDiscovery.gatherTestItems(this.ctrl.items),
            request,
        );
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = this.testRunnerFactory.create(queue, testRun, request);
        runner.emit(TestRunnerEvent.start, undefined);

        const process = runner.run(builder);
        cancellation?.onCancellationRequested(() => process.abort());

        await process.run();
        runner.emit(TestRunnerEvent.done, undefined);
        testRun.end();
    }

    private async runTestQueue(builder: ProcessBuilder, testRun: TestRun, request: TestRunRequest, cancellation?: CancellationToken) {
        const queue = await this.testDiscovery.discover(
            request.include ?? this.testDiscovery.gatherTestItems(this.ctrl.items),
            request,
        );
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = this.testRunnerFactory.create(queue, testRun, request);
        runner.emit(TestRunnerEvent.start, undefined);

        const processes = this.createProcesses(runner, builder, request);
        cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

        await Promise.all(processes.map((process) => process.run()));
        await this.coverageCollector.collect(processes, testRun);

        runner.emit(TestRunnerEvent.done, undefined);
    };

    private createProcesses(runner: TestRunner, builder: ProcessBuilder, request: TestRunRequest) {
        if (!request.include) {
            return [runner.run(builder)];
        }

        return request.include
            .map((testItem) => this.testCollection.getTestCase(testItem)!)
            .map((testCase, index) => testCase.update(builder, index))
            .map((builder) => runner.run(builder));
    }
}
