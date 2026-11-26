import { vi } from 'vitest';

const debug = {
    activeDebugSession: { type: 'php' },
    startDebugging: vi.fn(),
    stopDebugging: vi.fn(),
};

export { debug };
