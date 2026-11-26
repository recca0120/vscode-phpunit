import { describe, expect, it } from 'vitest';
import { XdebugDebug } from './XdebugDebug';

describe('XdebugDebug', () => {
    it('phpUnitArgs returns empty in debug mode', () => {
        const debug = new XdebugDebug(true);

        expect(debug.phpUnitArgs()).toEqual([]);
    });
});
