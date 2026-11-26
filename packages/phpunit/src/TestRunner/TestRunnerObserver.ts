import type { EventResultMap } from './TestRunnerEvent';

export interface TestRunnerEmitter {
    emit<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]): void;
}

export type TestRunnerObserver = Partial<{
    [K in keyof EventResultMap]: (result: EventResultMap[K]) => void;
}>;
