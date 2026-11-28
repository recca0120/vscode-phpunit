import { vi } from 'vitest';
import { Disposable } from './types';

const commands = (() => {
    const commands = new Map<string, (...rest: any[]) => void>();
    const executed: [string, unknown[]][] = [];
    return {
        executed,
        registerCommand: vi
            .fn()
            .mockImplementation((command: string, callback: (...rest: any[]) => void) => {
                commands.set(command, callback);
                return new Disposable();
            }),
        executeCommand: async (command: string, ...rest: any[]) => {
            executed.push([command, rest]);
            return commands.get(command)?.(...rest);
        },
    };
})();

export { commands };
