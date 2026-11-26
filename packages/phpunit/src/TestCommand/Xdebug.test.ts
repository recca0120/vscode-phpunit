import { describe, expect, it } from 'vitest';
import type { IConfiguration } from '../Configuration';
import { PathReplacer } from '../Configuration';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import { Mode, Xdebug } from './Xdebug';

const stubConfig: IConfiguration = {
    get: () => undefined,
    has: () => false,
    update: async () => {},
    getArguments: () => [],
    getConfigurationFile: async () => undefined,
};

const givenXdebug = () => new Xdebug(stubConfig);

describe('Xdebug', () => {
    describe('coverage mode', () => {
        it('setMode(coverage) enables coverage mode', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);

            expect(xdebug.isCoverageMode()).toBe(true);
            expect(xdebug.isDebugMode()).toBe(false);
            expect(xdebug.getCloverFile()).toBeUndefined();
        });

        it('setCloverFile / getCloverFile', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);
            xdebug.setCloverFile('/workspace/.phpunit.cache/coverage-abc-0.xml');

            expect(xdebug.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
        });

        it('getCloverFile returns undefined when not in coverage mode', async () => {
            const xdebug = givenXdebug();
            xdebug.setCloverFile('/workspace/.phpunit.cache/coverage-abc-0.xml');

            expect(xdebug.getCloverFile()).toBeUndefined();
        });

        it('getPhpUnitArgs returns empty when no clover file set', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);

            expect(xdebug.getPhpUnitArgs(new PathReplacer())).toEqual([]);
        });

        it('getPhpUnitArgs returns --coverage-clover with local path', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);
            xdebug.setCloverFile('/workspace/.phpunit.cache/coverage-abc-0.xml');

            expect(xdebug.getPhpUnitArgs(new PathReplacer())).toEqual([
                '--coverage-clover',
                '/workspace/.phpunit.cache/coverage-abc-0.xml',
            ]);
        });

        it('getPhpUnitArgs applies pathReplacer.toRemote to clover path', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);
            xdebug.setCloverFile('/local/workspace/.phpunit.cache/coverage-abc-0.xml');

            const pathReplacer = new PathReplacer(
                { cwd: '/local/workspace' },
                { [VAR_WORKSPACE_FOLDER]: '/app' },
            );

            expect(xdebug.getPhpUnitArgs(pathReplacer)).toEqual([
                '--coverage-clover',
                '/app/.phpunit.cache/coverage-abc-0.xml',
            ]);
        });

        it('clone preserves clover file', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);
            xdebug.setCloverFile('/workspace/.phpunit.cache/coverage-abc-0.xml');

            const cloned = xdebug.clone();
            expect(cloned.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
        });

        it('clone can be given a new clover file independently', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.coverage);
            xdebug.setCloverFile('/workspace/.phpunit.cache/coverage-abc-0.xml');

            const cloned = xdebug.clone();
            cloned.setCloverFile('/workspace/.phpunit.cache/coverage-abc-1.xml');

            expect(xdebug.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
            expect(cloned.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-1.xml');
        });
    });

    describe('debug mode', () => {
        it('setMode(debug) enables debug mode', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.debug);

            expect(xdebug.isDebugMode()).toBe(true);
            expect(xdebug.isCoverageMode()).toBe(false);
        });

        it('getPhpUnitArgs returns empty in debug mode', async () => {
            const xdebug = givenXdebug();
            await xdebug.setMode(Mode.debug);

            expect(xdebug.getPhpUnitArgs(new PathReplacer())).toEqual([]);
        });
    });
});
