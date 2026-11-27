import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { givenCommand } from '../../tests/support/testCommand';
import { phpUnitProjectWin } from '../../tests/support/windowsPath';
import { RemotePathMapper } from '../Path';

describe('TestCommand', () => {
    describe('running locally', () => {
        it('exposes its path mapper', () => {
            const command = givenCommand({ phpunit: 'vendor/bin/phpunit' });

            expect(command.paths).toBeInstanceOf(RemotePathMapper);
        });

        it('adds --functional to a paratest run with --filter', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/paratest',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/paratest',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '--colors=always',
                '--teamcity',
                '--functional',
            ]);
        });

        it('passes a Windows test file path through', () => {
            const cwd = phpUnitProjectWin('');
            const testFile = phpUnitProjectWin('tests/AssertionsTest.php');
            const command = givenCommand(
                {
                    phpunit: phpUnitProjectWin('vendor/bin/phpunit'),
                },
                cwd,
            ).withArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                phpUnitProjectWin('vendor/bin/phpunit'),
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                phpUnitProjectWin('tests/AssertionsTest.php'),
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('keeps repeated --group arguments (#432)', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
            }).withArguments('--group=command --group=use-db tests/DbCommandTest.php');

            const { args } = command.build();
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--group=command',
                '--group=use-db',
                'tests/DbCommandTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('does not let a flag from args swallow the test file', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
                args: ['--stop-on-failure'],
            }).withArguments('/a/FooTest.php');

            const { args } = command.build();
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--stop-on-failure',
                '/a/FooTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('keeps an args option value containing spaces as one argument', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
                args: ['--group=my group'],
            }).withArguments('/a/FooTest.php');

            const { args } = command.build();
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--group=my group',
                '/a/FooTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('passes args with values through unchanged', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
                args: ['--repeat=2', '--order-by=random'],
            });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--repeat=2',
                '--order-by=random',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('keeps --no-* arguments as they are', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
                args: ['--no-coverage', '--no-logging'],
            });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--no-coverage',
                '--no-logging',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('exports the configured environment to the spawned process', () => {
            const environment = {
                XDEBUG_MODE: 'coverage',
                MEMORY_LIMIT: '-1',
            };

            const command = givenCommand({ environment, phpunit: 'vendor/bin/phpunit' });

            const { runtime, args, options } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
            expect(options.cwd).toEqual(phpUnitProject(''));

            for (const [key, value] of Object.entries(environment)) {
                expect(
                    spawnSync('php', ['-r', `echo getenv('${key}');`], options).stdout.toString(),
                ).toEqual(value);
            }
        });

        it("splits an 'artisan test' binary into two arguments", () => {
            const command = givenCommand({ phpunit: 'artisan test' });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['artisan', 'test', '--colors=always', '--teamcity']);
        });

        it('keeps an apostrophe inside a Pest filter', () => {
            const filter = "^.*::(it has user's email)(( with (data set )?.*)?)?$";

            const cwd = phpUnitProject('');
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const command = givenCommand(
                {
                    phpunit: 'vendor/bin/pest',
                },
                cwd,
            ).withArguments(`${testFile} --filter="${filter}"`);

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/pest',
                `--filter=^.*::(it has user's email)(( with (data set )?.*)?)?$`,
                phpUnitProject('tests/AssertionsTest.php'),
                '--colors=always',
                '--teamcity',
            ]);
        });
        it('handles a php binary path with spaces', () => {
            const command = givenCommand({
                php: 'C:\\Program Files\\PHP\\php',
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('C:\\Program Files\\PHP\\php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
        });

        it('handles a phpunit binary path with spaces', () => {
            const cwd = 'd:\\All Project\\adminservice-collaboration';
            const command = givenCommand(
                {
                    phpunit: 'd:\\All Project\\adminservice-collaboration\\vendor\\bin\\phpunit',
                },
                cwd,
            );

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'd:\\All Project\\adminservice-collaboration\\vendor\\bin\\phpunit',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('handles test paths with spaces', () => {
            const cwd = 'd:\\All Project\\adminservice-collaboration';
            const testFile = 'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php';
            const command = givenCommand(
                {
                    phpunit: 'vendor/bin/phpunit',
                },
                cwd,
            ).withArguments(`"${testFile}"`);

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('handles test paths with spaces and a filter', () => {
            const cwd = 'd:\\All Project\\adminservice-collaboration';
            const testFile = 'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php';
            const command = givenCommand(
                {
                    phpunit: 'vendor/bin/phpunit',
                },
                cwd,
            ).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$' "${testFile}"`);

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });
    });
});
