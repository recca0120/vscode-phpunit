import { TestOutputParser } from '../TestOutput';
import type { ProcessCommand } from './ProcessCommand';
import {
    createTestRunnerEventProxy,
    type EventResultMap,
    type TestRunnerEmitter,
    type TestRunnerEventProxy,
    type TestRunnerObserver,
} from './TestRunnerObserver';
import { TestRunnerProcess } from './TestRunnerProcess';

export class TestRunner implements TestRunnerEmitter {
    private readonly defaultObserver: TestRunnerEventProxy;
    private readonly testOutputParser = new TestOutputParser();
    private observers: TestRunnerObserver[] = [];

    constructor() {
        this.defaultObserver = createTestRunnerEventProxy();
        this.observe(this.defaultObserver);
    }

    observe(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on<K extends keyof EventResultMap>(
        eventName: K,
        callback: (result: EventResultMap[K]) => void,
    ): this {
        this.defaultObserver.on(eventName, callback);

        return this;
    }

    run(command: ProcessCommand) {
        return new TestRunnerProcess(command, this, this.testOutputParser);
    }

    emit<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]) {
        for (const observer of this.observers) {
            const handler = observer[eventName] as
                | ((result: EventResultMap[K]) => void)
                | undefined;
            handler?.call(observer, result);
        }
    }
}
