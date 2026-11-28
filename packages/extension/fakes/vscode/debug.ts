import { vi } from 'vitest';
import { FakeEventEmitter } from './types';

const sessionStarted = new FakeEventEmitter<unknown>();

const startActiveSession = async () => {
    sessionStarted.fire(debug.activeDebugSession);
    return true;
};

const debug = {
    activeDebugSession: { type: 'php' } as unknown,
    onDidStartDebugSession: sessionStarted.event,
    startDebugging: vi.fn().mockImplementation(startActiveSession),
    stopDebugging: vi.fn(),
    startSession(session: unknown) {
        debug.activeDebugSession = session;
        sessionStarted.fire(session);
    },
};

export { debug, startActiveSession };
