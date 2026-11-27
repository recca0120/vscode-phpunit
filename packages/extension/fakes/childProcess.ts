import { vi } from 'vitest';

vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...actual, spawn: vi.fn(actual.spawn) };
});
