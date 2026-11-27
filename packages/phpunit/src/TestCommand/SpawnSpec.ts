import type { SpawnOptions } from 'node:child_process';

export type SpawnSpec = { runtime: string; args: string[]; options: SpawnOptions };
