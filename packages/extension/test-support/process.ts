import { spawn } from 'node:child_process';
import { expect } from 'vitest';
import { samePath } from './paths';

export type SpawnExpectation = {
    command?: string;
    args: (string | RegExp)[];
    cwd: string;
    env?: Record<string, string>;
};

export const expectSpawned = ({ command = 'php', args, cwd, env }: SpawnExpectation) => {
    expect(spawn).toHaveBeenCalledWith(
        command,
        expect.arrayContaining(
            args.map((arg) => (arg instanceof RegExp ? expect.stringMatching(arg) : samePath(arg))),
        ),
        expect.objectContaining({
            cwd: samePath(cwd),
            ...(env && { env: expect.objectContaining(env) }),
        }),
    );
};
