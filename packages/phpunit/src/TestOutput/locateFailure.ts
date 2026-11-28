import type { TestFailed } from './types';

export type FailureFrame = { file: string; line: number };

export type FailureLocation = {
    location?: FailureFrame;
    stackTrace: FailureFrame[];
};

export const locateFailure = ({
    file,
    details,
}: Pick<TestFailed, 'file' | 'details'>): FailureLocation => {
    if (details.length === 0 || !file) {
        return { location: undefined, stackTrace: [] };
    }

    const location = details.find((frame) => frame.file === file);
    const stackTrace = details.filter(
        (frame) => !location || frame.file !== location.file || frame.line !== location.line,
    );

    return { location, stackTrace };
};
