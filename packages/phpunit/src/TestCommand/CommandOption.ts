import type { PathMapper } from '../Configuration/PathMapper';

export interface CommandOption {
    isEnabled(): boolean;
    phpArgs(): string[];
    environment(): Record<string, string>;
    phpUnitArgs(paths: PathMapper): string[];
}
