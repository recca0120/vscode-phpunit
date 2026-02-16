import { inject, injectable } from 'inversify';
import type { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from '../Configuration';
import type { IConfiguration, TestDefinition, TestRunnerObserver } from '../PHPUnit';
import { TYPES } from '../types';
import { ErrorDialogObserver } from './ErrorDialogObserver';
import { OutputChannelObserver } from './OutputChannelObserver';
import { OutputFormatter } from './Printers';
import { TestResultObserver } from './TestResultObserver';

@injectable()
export class TestRunnerObserverFactory {
    constructor(
        @inject(TYPES.OutputChannel) private outputChannel: OutputChannel,
        @inject(Configuration) private configuration: IConfiguration,
        @inject(OutputFormatter) private outputFormatter: OutputFormatter,
    ) {}

    create(
        queue: Map<TestDefinition, TestItem>,
        testRun: TestRun,
        request: TestRunRequest,
    ): TestRunnerObserver[] {
        return [
            new TestResultObserver(queue, testRun),
            new OutputChannelObserver(this.outputChannel, this.configuration, this.outputFormatter, request),
            new ErrorDialogObserver(this.configuration),
        ];
    }
}
