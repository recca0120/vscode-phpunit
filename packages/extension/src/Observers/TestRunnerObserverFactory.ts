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
import type { OutputChannel, TestItem, TestRun } from 'vscode';
import { Configuration } from '../Configuration';
import { TestCollection } from '../TestCollection/TestCollection';
import { TYPES } from '../types';
import { DatasetObserver } from './DatasetObserver';
import { ErrorDialogObserver } from './ErrorDialogObserver';
import { PrinterObserver } from './PrinterObserver';
import { RawOutputObserver } from './RawOutputObserver';
import { TestResultObserver } from './TestResultObserver';
import { TestRunWriter } from './Writers';

@injectable()
export class TestRunnerObserverFactory {
    constructor(
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.OutputChannel) private outputChannel: OutputChannel,
        @inject(Configuration) private configuration: IConfiguration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
    ) {}

    create(queue: Map<TestDefinition, TestItem>, testRun: TestRun): TestRunnerObserver[] {
        const testItemById = new Map([...queue.values()].map((item) => [item.id, item]));
        const format = resolveFormat(
            (this.configuration.get('output.preset') ?? 'collision') as
                | 'progress'
                | 'collision'
                | 'pretty',
            this.configuration.get('output.format') as Partial<PrinterFormat> | undefined,
        );

        return [
            new DatasetObserver(this.testCollection, testItemById),
            new TestResultObserver(testItemById, queue, testRun),
            new RawOutputObserver(this.outputChannel, this.configuration),
            new PrinterObserver(new TestRunWriter(testRun), new Printer(this.phpUnitXML, format)),
            new ErrorDialogObserver(this.configuration),
        ];
    }
}
