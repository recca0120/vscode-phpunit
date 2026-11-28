import { describe, expect, it } from 'vitest';
import { classifyFailure } from './classifyFailure';

describe('classifyFailure', () => {
    it.each([
        ['PHPUnit 9 exception', 'RuntimeException : boom'],
        ['PHPUnit 9 namespaced exception', 'App\\Tests\\DomainFailure : bad state'],
        ['PHPUnit 9 PHP error', 'Error : Call to a member function method() on null'],
        ['PHPUnit 10+ and Pest exception', 'RuntimeException: boom'],
        ['PHPUnit 10+ namespaced exception', 'App\\Tests\\DomainFailure: bad state'],
        ['PHPUnit 10+ and Pest PHP error', 'Error: Call to a member function method() on null'],
    ])('takes a %s for an error', (_kind, message) => {
        expect(classifyFailure({ message, details: [] })).toBe('error');
    });

    it.each([
        ['a failed assertion', 'Failed asserting that 2 is identical to 1.'],
        [
            'a failed assertion with a message',
            'Config: missing key\nFailed asserting that false is true.',
        ],
        ['an explicit fail()', 'plain reason'],
    ])('takes %s for a failure', (_kind, message) => {
        expect(classifyFailure({ message, details: [] })).toBe('failure');
    });

    it('takes a test without assertions for risky', () => {
        expect(
            classifyFailure({ message: 'This test did not perform any assertions', details: [] }),
        ).toBe('risky');
    });
});
