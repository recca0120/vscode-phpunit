import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { givenCommand } from '../../test-support/testCommand';
import { Configuration } from '../Configuration';
import { RemotePathMapper } from '../Path';
import { type TestDefinition, TestType } from '../types';
import { Mode, Xdebug } from './Option/Xdebug';
import { TestCommand } from './TestCommand';

const unitSuite: TestDefinition = {
    type: TestType.testsuite,
    id: 'testsuite:Unit',
    label: 'Unit',
    testsuite: 'Unit',
};

const dbCommandTest: TestDefinition = {
    type: TestType.class,
    id: 'App\\Tests\\Command\\DbCommandTest',
    label: 'DbCommandTest',
    classFQN: 'App\\Tests\\Command\\DbCommandTest',
    file: '/path/to/DbCommandTest.php',
    annotations: { group: ['command'] },
};

describe('TestCommand forTests', () => {
    it('runs everything in one command when no tests are given', async () => {
        const command = givenCommand({ phpunit: 'vendor/bin/phpunit' });

        const commands = await command.forTests();

        expect(commands.map((each) => each.build().args)).toEqual([
            ['vendor/bin/phpunit', '--colors=always', '--teamcity'],
        ]);
    });

    it('runs each given test in its own command with its filter', async () => {
        const command = givenCommand({ phpunit: 'vendor/bin/phpunit' });

        const commands = await command.forTests([unitSuite, dbCommandTest]);

        expect(commands.map((each) => each.build().args)).toEqual([
            ['vendor/bin/phpunit', '--testsuite=Unit', '--colors=always', '--teamcity'],
            [
                'vendor/bin/phpunit',
                '--group=command',
                '/path/to/DbCommandTest.php',
                '--colors=always',
                '--teamcity',
            ],
        ]);
    });

    it('collects no coverage outside coverage mode', async () => {
        const command = givenCommand({ phpunit: 'vendor/bin/phpunit' });

        const commands = await command.forTests([unitSuite, dbCommandTest]);

        expect(commands.map((each) => each.cloverFile())).toEqual([undefined, undefined]);
    });

    describe('in coverage mode', () => {
        let cwd: string;

        beforeEach(async () => {
            cwd = await mkdtemp(join(tmpdir(), 'phpunit-for-tests-'));
        });

        afterEach(async () => {
            await rm(cwd, { recursive: true, force: true });
        });

        const coverageCommand = async () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd };
            const xdebug = await new Xdebug(config).setMode(Mode.coverage);

            return new TestCommand(
                config,
                options,
                new RemotePathMapper(options, {}),
                xdebug.options(),
            );
        };

        it('gives each command its own clover file in the prepared cache directory', async () => {
            const commands = await (await coverageCommand()).forTests([unitSuite, dbCommandTest]);

            const cloverFiles = commands.map((each) => each.cloverFile() as string);
            expect(cloverFiles[0]).toMatch(/[/\\]\.phpunit\.cache[/\\]coverage-[0-9a-f]+-0\.xml$/);
            expect(cloverFiles[1]).toMatch(/[/\\]\.phpunit\.cache[/\\]coverage-[0-9a-f]+-1\.xml$/);
            expect(dirname(cloverFiles[0])).toBe(join(cwd, '.phpunit.cache'));
            expect((await stat(join(cwd, '.phpunit.cache'))).isDirectory()).toBe(true);
        });

        it('gives the single command of a whole run a clover file', async () => {
            const commands = await (await coverageCommand()).forTests();

            expect(commands.map((each) => each.cloverFile())).toEqual([
                expect.stringMatching(/coverage-[0-9a-f]+-0\.xml$/),
            ]);
        });
    });
});
