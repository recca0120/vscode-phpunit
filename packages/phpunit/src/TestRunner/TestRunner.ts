import type { ProcessCommand } from './ProcessCommand';
import type { EventResultMap } from './TestRunnerEvent';
import { createTestRunnerEventProxy, type TestRunnerEventProxy } from './TestRunnerEventProxy';
import type { TestRunnerEmitter, TestRunnerObserver } from './TestRunnerObserver';
import { TestRunnerProcess } from './TestRunnerProcess';

export class TestRunner implements TestRunnerEmitter {
    private readonly listeners: TestRunnerEventProxy;
    private observers: TestRunnerObserver[] = [];

    constructor() {
        this.listeners = createTestRunnerEventProxy();
        this.observe(this.listeners);
    }

    observe(observer: TestRunnerObserver) {
        this.observers.push(observer);
    }

    on<K extends keyof EventResultMap>(
        eventName: K,
        callback: (result: EventResultMap[K]) => void,
    ): this {
        this.listeners.on(eventName, callback);

        return this;
    }

    run(command: ProcessCommand) {
        return new TestRunnerProcess(command, this);
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
