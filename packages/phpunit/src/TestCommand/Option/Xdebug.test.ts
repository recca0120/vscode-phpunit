import { describe, expect, it } from 'vitest';
import { Configuration } from '../../Configuration';
import { Mode, Xdebug } from './Xdebug';
import { XdebugCoverage } from './XdebugCoverage';

const givenXdebug = () => new Xdebug(new Configuration());

const coverageOf = (xdebug: Xdebug) =>
    xdebug.options().find((option) => option instanceof XdebugCoverage);

describe('Xdebug', () => {
    describe('coverage mode', () => {
        it('setMode(coverage) enables coverage mode', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);

            expect(xdebug.isCoverageMode()).toBe(true);
            expect(xdebug.isDebugMode()).toBe(false);
            expect(coverageOf(xdebug)?.cloverFile()).toBeUndefined();
        });
    });

    describe('debug mode', () => {
        it('setMode(debug) enables debug mode', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.debug);

            expect(xdebug.isDebugMode()).toBe(true);
            expect(xdebug.isCoverageMode()).toBe(false);
        });
    });
});
