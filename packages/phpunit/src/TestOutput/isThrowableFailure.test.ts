import { describe, expect, it } from 'vitest';
import { isThrowableFailure } from './isThrowableFailure';

describe('isThrowableFailure', () => {
    it.each([
        ['PHPUnit 9 exception', 'RuntimeException : boom'],
        ['PHPUnit 9 namespaced exception', 'App\\Tests\\DomainFailure : bad state'],
        ['PHPUnit 9 PHP error', 'Error : Call to a member function method() on null'],
        ['PHPUnit 10+ and Pest exception', 'RuntimeException: boom'],
        ['PHPUnit 10+ namespaced exception', 'App\\Tests\\DomainFailure: bad state'],
        ['PHPUnit 10+ and Pest PHP error', 'Error: Call to a member function method() on null'],
    ])('takes a %s for an error', (_kind, message) => {
        expect(isThrowableFailure({ message })).toBe(true);
    });

    it.each([
        ['a failed assertion', 'Failed asserting that 2 is identical to 1.'],
        [
            'a failed assertion with a message',
            'Config: missing key\nFailed asserting that false is true.',
        ],
    ])('takes %s for a failure', (_kind, message) => {
        expect(isThrowableFailure({ message })).toBe(false);
    });
});
