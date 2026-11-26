import type { PathMapper } from '../Configuration/PathMapper';
import type { TestResult } from './types';

export function toLocalResult(result: TestResult, paths: PathMapper): TestResult {
    const replaced: Record<string, unknown> = {};

    if ('locationHint' in result && result.locationHint) {
        replaced.locationHint = paths.toLocal(result.locationHint);
    }

    if ('file' in result && result.file) {
        replaced.file = paths.toLocal(result.file);
    }

    if ('details' in result) {
        replaced.details = result.details.map(({ file, line }) => ({
            file: paths.toLocal(file),
            line,
        }));
    }

    return Object.keys(replaced).length > 0 ? { ...result, ...replaced } : result;
}
