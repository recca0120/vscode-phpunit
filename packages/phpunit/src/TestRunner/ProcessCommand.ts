import type { PathMapper } from '../Configuration/PathMapper';
import type { SpawnSpec } from '../TestCommand/Environment';

export interface ProcessCommand {
    readonly paths: PathMapper;
    build(): SpawnSpec;
    getCloverFile(): string | undefined;
    toString(): string;
}
