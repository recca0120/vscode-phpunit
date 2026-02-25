import { describe, expect, it } from 'vitest';
import { base64DecodeFilter, base64EncodeFilter } from './FilterEncoder';

describe('FilterEncoder', () => {
    describe('base64EncodeFilter', () => {
        it('encodes filter value to base64', () => {
            const result = base64EncodeFilter(['--filter=^.*::(test_passed)$']);

            expect(result).toEqual([
                `--filter='${Buffer.from('^.*::(test_passed)$').toString('base64')}'`,
            ]);
        });
    });

    describe('base64DecodeFilter', () => {
        it('decodes without quoting', () => {
            const encoded = base64EncodeFilter(['--filter=^.*::(test_passed)$']);
            const result = base64DecodeFilter(encoded, false);

            expect(result).toEqual(['--filter=^.*::(test_passed)$']);
        });

        it('wraps with single quotes when no apostrophe', () => {
            const encoded = base64EncodeFilter(['--filter=^.*::(test_passed)$']);
            const result = base64DecodeFilter(encoded, true);

            expect(result).toEqual(["'--filter=^.*::(test_passed)$'"]);
        });

        it('wraps with double quotes and escapes inner quotes when value has apostrophe', () => {
            const filter =
                `/^.*::(it has user\\'s email` +
                ` with data set "\\(\\'other@example\\.com\\'\\)")$/`;
            const encoded = base64EncodeFilter([`--filter=${filter}`]);
            const result = base64DecodeFilter(encoded, true);

            const escapedFilter = filter.replace(/"/g, '\\"');
            expect(result).toEqual([`"--filter=${escapedFilter}"`]);
        });
    });
});
