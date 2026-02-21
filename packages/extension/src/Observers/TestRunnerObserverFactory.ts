import {
    type IConfiguration,
    PHPUnitXML,
    type TestDefinition,
    type TestRunnerObserver,
} from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from '../Configuration';
import { TestCollection } from '../TestCollection/TestCollection';
import { TYPES } from '../types';
import { DatasetChildObserver } from './DatasetChildObserver';
import { ErrorDialogObserver } from './ErrorDialogObserver';
import { OutputChannelObserver } from './OutputChannelObserver';
import { CollisionPrinter } from './Printers';
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
        return [
            new DatasetChildObserver(this.testCollection, queue, testRun),
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
