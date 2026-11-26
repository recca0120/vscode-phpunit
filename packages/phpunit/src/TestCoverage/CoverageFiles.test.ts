import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/utils';
import { CoverageFiles } from './CoverageFiles';

describe('CoverageFiles', () => {
    it('allocates a clover file under .phpunit.cache', () => {
        const coverage = new CoverageFiles(phpUnitProject(''));

        expect(coverage.allocate(0)).toMatch(/\.phpunit\.cache[/\\]coverage-.*-0\.xml$/);
    });
});
