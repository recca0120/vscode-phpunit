import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { Configuration } from '../Configuration';
import { RemotePathMapper } from '../Path';
import { CoverageFiles } from '../TestCoverage';
import { Mode, Xdebug } from './Option/Xdebug';
import { TestCommand } from './TestCommand';

describe('TestCommand', () => {
    describe('coverage clover', () => {
        it('sets the clover file in coverage mode', async () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const remotePathMapper = new RemotePathMapper(options, {});
            const xdebug = await new Xdebug(config).setMode(Mode.coverage);
            const command = new TestCommand(config, options, remotePathMapper, xdebug.options());

            const covered = command.withCoverageClover(new CoverageFiles(options.cwd).allocate(0));

            expect(covered.cloverFile()).toMatch(/\.phpunit\.cache[/\\]coverage-.*-0\.xml$/);
        });

        it('has no clover file outside coverage mode', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const remotePathMapper = new RemotePathMapper(options, {});
            const xdebug = new Xdebug(config);
            const command = new TestCommand(config, options, remotePathMapper, xdebug.options());

            expect(command.cloverFile()).toBeUndefined();
        });

        it('has no clover file without xdebug', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const remotePathMapper = new RemotePathMapper(options, {});
            const command = new TestCommand(config, options, remotePathMapper);

            expect(command.cloverFile()).toBeUndefined();
        });
    });

    describe('withArguments', () => {
        it('gives the new command independent options', async () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const remotePathMapper = new RemotePathMapper(options, {});
            const xdebug = await new Xdebug(config).setMode(Mode.coverage);
            const command = new TestCommand(
                config,
                options,
                remotePathMapper,
                xdebug.options(),
            ).withCoverageClover('/workspace/.phpunit.cache/coverage-abc-0.xml');

            const cloned = command
                .withArguments('')
                .withCoverageClover('/workspace/.phpunit.cache/coverage-abc-1.xml');

            expect(command.cloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
            expect(cloned.cloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-1.xml');
        });

        it('creates the new command without options when none are set', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const remotePathMapper = new RemotePathMapper(options, {});
            const command = new TestCommand(config, options, remotePathMapper);

            const cloned = command.withArguments('');

            expect(cloned.debug()).toBeUndefined();
            expect(cloned.coverage()).toBeUndefined();
        });
    });
});
