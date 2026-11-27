import { describe, expect, it } from 'vitest';
import { semverGte, semverLt } from './semver';

describe('semver', () => {
    describe('semverGte / semverLt', () => {
        it('10.4.2 >= 10.0.0', () => {
            expect(semverGte('10.4.2', '10.0.0')).toBe(true);
        });

        it('9.5.0 < 10.0.0', () => {
            expect(semverLt('9.5.0', '10.0.0')).toBe(true);
        });

        it('10.0.0 >= 10.0.0', () => {
            expect(semverGte('10.0.0', '10.0.0')).toBe(true);
        });

        it('10.0.0 is not < 10.0.0', () => {
            expect(semverLt('10.0.0', '10.0.0')).toBe(false);
        });

        it('12.0.0 >= 10.4.2', () => {
            expect(semverGte('12.0.0', '10.4.2')).toBe(true);
        });
    });
});
