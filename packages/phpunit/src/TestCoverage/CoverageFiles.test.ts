import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/utils';
import { CoverageFiles } from './CoverageFiles';

describe('CoverageFiles', () => {
    it('should set clover file on xdebug when in coverage mode', () => {
        const coverage = new CoverageFiles(phpUnitProject(''));

        expect(coverage.allocate(0)).toMatch(/\.phpunit\.cache[/\\]coverage-.*-0\.xml$/);
    });
});
