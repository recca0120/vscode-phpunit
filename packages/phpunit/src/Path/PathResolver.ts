import type { PathMapper } from './PathMapper';

export interface PathResolver extends PathMapper {
    resolveVariables(text: string): string;
}
