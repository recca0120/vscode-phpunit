import type { EventResultMap } from './TestRunnerEvent';
import type { TestRunnerObserver } from './TestRunnerObserver';

type EventListeners = {
    [K in keyof EventResultMap]?: Array<(result: EventResultMap[K]) => void>;
};

export interface TestRunnerEventProxy extends Required<TestRunnerObserver> {
    on<K extends keyof EventResultMap>(
        eventName: K,
        fn: (result: EventResultMap[K]) => void,
    ): TestRunnerEventProxy;
}

export function createTestRunnerEventProxy(): TestRunnerEventProxy {
    const listeners: EventListeners = {};

    const on = <K extends keyof EventResultMap>(
        eventName: K,
        fn: (result: EventResultMap[K]) => void,
    ): TestRunnerEventProxy => {
        if (!listeners[eventName]) {
            listeners[eventName] = [];
        }
        listeners[eventName]?.push(fn);
        return proxy;
    };

    const notify = <K extends keyof EventResultMap>(
        eventName: K,
        result: EventResultMap[K],
    ): void => {
        const callbacks = listeners[eventName];
        if (!callbacks) {
            return;
        }
        for (const callback of callbacks) {
            callback(result);
        }
    };

    const proxy = new Proxy({} as TestRunnerEventProxy, {
        get(_target, prop: string) {
            if (prop === 'on') {
                return on;
            }
            return (result: unknown) => notify(prop as keyof EventResultMap, result as never);
        },
    });

    return proxy;
}
