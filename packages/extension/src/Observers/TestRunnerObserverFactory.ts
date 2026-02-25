import {
    type IConfiguration,
    PHPUnitXML,
    Printer,
    type PrinterFormat,
    resolveFormat,
    type TestDefinition,
    type TestRunnerObserver,
} from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from '../Configuration';
import { TestCollection } from '../TestCollection/TestCollection';
import { TYPES } from '../types';
import { DatasetObserver } from './DatasetObserver';
import { ErrorDialogObserver } from './ErrorDialogObserver';
import { OutputChannelObserver } from './OutputChannelObserver';
import { TestResultObserver } from './TestResultObserver';

@injectable()
export class TestRunnerObserverFactory {
    constructor(
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.OutputChannel) private outputChannel: OutputChannel,
        @inject(Configuration) private configuration: IConfiguration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
    ) {}

    create(
        queue: Map<TestDefinition, TestItem>,
        testRun: TestRun,
        request: TestRunRequest,
    ): TestRunnerObserver[] {
        const testItemById = new Map([...queue.values()].map((item) => [item.id, item]));
        return [
            new DatasetObserver(this.testCollection, testItemById),
            new TestResultObserver(testItemById, queue, testRun),
            new OutputChannelObserver(
                this.outputChannel,
                this.configuration,
                new Printer(
                    this.phpUnitXML,
                    resolveFormat(
                        (this.configuration.get('output.preset') ?? 'collision') as
                            | 'progress'
                            | 'collision'
                            | 'pretty',
                        this.configuration.get('output.format') as
                            | Partial<PrinterFormat>
                            | undefined,
                    ),
                ),
                request,
            ),
            new ErrorDialogObserver(this.configuration),
        ];
    }
}
