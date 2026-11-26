import type { PathMapper } from '../Path/PathMapper';

export interface CommandOption {
    isEnabled(): boolean;
    phpArgs(): string[];
    environment(): Record<string, string>;
    phpUnitArgs(paths: PathMapper): string[];
}
