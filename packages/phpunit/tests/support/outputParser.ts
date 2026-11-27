import { expect } from 'vitest';
import type { TestOutputParser } from '../../src/TestOutput/TestOutputParser';

export const expectParsedBy =
    (parser: TestOutputParser) =>
    (content: string, expected: Record<string, unknown> | undefined) => {
        const actual = parser.parse(content);

        if (expected === undefined) {
            expect(actual).toBeUndefined();
        } else {
            expect(actual).toEqual(expect.objectContaining(expected));
        }
    };
