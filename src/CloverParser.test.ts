import { describe, expect, it } from '@jest/globals';
import { Position } from 'vscode';
import { CloverParser } from './CloverParser';

describe('CloverParser test', () => {
    it('parseClover', async () => {
        const cf = await CloverParser.parseClover('src/PHPUnit/__tests__/fixtures/test1.clover.xml');
        expect(cf.length).toEqual(3);
        const dc = cf[1].generateDetailedCoverage();
        expect(dc.length).toEqual(6);
        expect(dc[0].executed).toEqual(2);
        if (dc[0].location instanceof Position) {
            expect(dc[0].location.line).toEqual(8);
        }
    });
});
