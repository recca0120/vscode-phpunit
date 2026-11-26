import type { PathMapper } from '../Path/PathMapper';
import type { SpawnSpec } from '../TestCommand/Environment';

export interface ProcessCommand {
    readonly paths: PathMapper;
    build(): SpawnSpec;
    cloverFile(): string | undefined;
    toString(): string;
}
