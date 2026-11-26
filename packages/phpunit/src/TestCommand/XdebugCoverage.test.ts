import { describe, expect, it } from 'vitest';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import { RemotePathMapper } from '../Path';
import { XdebugCoverage } from './XdebugCoverage';

describe('XdebugCoverage', () => {
    it('withCloverFile / getCloverFile', () => {
        const coverage = new XdebugCoverage(true).withCloverFile(
            '/workspace/.phpunit.cache/coverage-abc-0.xml',
        );

        expect(coverage.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
    });

    it('getCloverFile returns undefined when not in coverage mode', () => {
        const coverage = new XdebugCoverage(false).withCloverFile(
            '/workspace/.phpunit.cache/coverage-abc-0.xml',
        );

        expect(coverage.getCloverFile()).toBeUndefined();
    });

    it('phpUnitArgs returns empty when no clover file set', () => {
        const coverage = new XdebugCoverage(true);

        expect(coverage.phpUnitArgs(new RemotePathMapper())).toEqual([]);
    });

    it('phpUnitArgs returns --coverage-clover with local path', () => {
        const coverage = new XdebugCoverage(true).withCloverFile(
            '/workspace/.phpunit.cache/coverage-abc-0.xml',
        );

        expect(coverage.phpUnitArgs(new RemotePathMapper())).toEqual([
            '--coverage-clover',
            '/workspace/.phpunit.cache/coverage-abc-0.xml',
        ]);
    });

    it('phpUnitArgs applies remotePathMapper.toRemote to clover path', () => {
        const coverage = new XdebugCoverage(true).withCloverFile(
            '/local/workspace/.phpunit.cache/coverage-abc-0.xml',
        );

        const remotePathMapper = new RemotePathMapper(
            { cwd: '/local/workspace' },
            { [VAR_WORKSPACE_FOLDER]: '/app' },
        );

        expect(coverage.phpUnitArgs(remotePathMapper)).toEqual([
            '--coverage-clover',
            '/app/.phpunit.cache/coverage-abc-0.xml',
        ]);
    });

    it('withEnabled preserves clover file', () => {
        const coverage = new XdebugCoverage(true).withCloverFile(
            '/workspace/.phpunit.cache/coverage-abc-0.xml',
        );

        const copy = coverage.withEnabled(true);
        expect(copy.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
    });

    it('withCloverFile returns an independent copy', () => {
        const coverage = new XdebugCoverage(true).withCloverFile(
            '/workspace/.phpunit.cache/coverage-abc-0.xml',
        );

        const copy = coverage.withCloverFile('/workspace/.phpunit.cache/coverage-abc-1.xml');

        expect(coverage.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
        expect(copy.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-1.xml');
    });
});
