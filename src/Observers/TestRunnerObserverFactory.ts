import { inject, injectable } from 'inversify';
import type { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from '../Configuration';
import {
    type IConfiguration,
    PHPUnitXML,
    type TestDefinition,
    type TestRunnerObserver,
} from '../PHPUnit';
import { TYPES } from '../types';
import { ErrorDialogObserver } from './ErrorDialogObserver';
import { OutputChannelObserver } from './OutputChannelObserver';
import { CollisionPrinter } from './Printers';
import { TestResultObserver } from './TestResultObserver';

@injectable()
export class TestRunnerObserverFactory {
    constructor(
        @inject(TYPES.OutputChannel) private outputChannel: OutputChannel,
        @inject(Configuration) private configuration: IConfiguration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
    ) {}

    create(
        queue: Map<TestDefinition, TestItem>,
        testRun: TestRun,
        request: TestRunRequest,
    ): TestRunnerObserver[] {
        return [
            new TestResultObserver(queue, testRun),
            new OutputChannelObserver(
                this.outputChannel,
                this.configuration,
                new CollisionPrinter(this.phpUnitXML),
                request,
            ),
            new ErrorDialogObserver(this.configuration),
        ];
    }
}
