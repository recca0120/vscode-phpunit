import { vi } from 'vitest';
import { Disposable } from './types';

const commands = (() => {
    const commands = new Map<string, (...rest: any[]) => void>();
    return {
        registerCommand: vi
            .fn()
            .mockImplementation((command: string, callback: (...rest: any[]) => void) => {
                commands.set(command, callback);
                return new Disposable();
            }),
        executeCommand: async (command: string, ...rest: any[]) => {
            return commands.get(command)!(...rest);
        },
    };
})();

export { commands };
