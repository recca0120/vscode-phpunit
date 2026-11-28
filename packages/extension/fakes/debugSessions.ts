import { vi } from 'vitest';
import { type DebugSession, debug, type WorkspaceFolder } from 'vscode';

const fakeDebug = debug as unknown as { startSession(session: DebugSession): void };

export const startOneDebugSessionPerFolder = () => {
    const started: DebugSession[] = [];
    vi.mocked(debug.startDebugging).mockImplementation(async (folder) => {
        const session = { type: 'php', workspaceFolder: folder as WorkspaceFolder } as DebugSession;
        started.push(session);
        await new Promise((resolve) => setTimeout(resolve, 0));
        fakeDebug.startSession(session);
        return true;
    });

    return started;
};

export const stoppedDebugSessions = () =>
    vi.mocked(debug.stopDebugging).mock.calls.map(([session]) => session);
