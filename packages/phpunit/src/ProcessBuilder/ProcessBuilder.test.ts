import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { phpUnitProject, phpUnitProjectWin } from '../../tests/utils';
import { Configuration, PathReplacer } from '../Configuration';
import { CMD_TEMPLATE, VAR_PWD, VAR_WORKSPACE_FOLDER } from '../constants';
import { ProcessBuilder } from './ProcessBuilder';
import { Mode, Xdebug } from './Xdebug';

describe('ProcessBuilder Test', () => {
    describe('LocalCommand', () => {
        const givenBuilder = (configuration: Record<string, unknown>, cwd?: string) => {
            const config = new Configuration({ php: 'php', ...configuration });
            const options = { cwd: cwd ?? phpUnitProject('') };
            const pathReplacer = new PathReplacer(
                options,
                config.get('paths') as Record<string, string>,
            );
            return new ProcessBuilder(config, options, pathReplacer);
        };

        it('getPathReplacer returns PathReplacer instance', () => {
            const builder = givenBuilder({ phpunit: 'vendor/bin/phpunit' });

            expect(builder.getPathReplacer()).toBeInstanceOf(PathReplacer);
        });

        it('run paratest with --functional and --filter', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/paratest',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/paratest',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '--colors=always',
                '--teamcity',
                '--functional',
            ]);
        });

        it('should run Windows Path', () => {
            const cwd = phpUnitProjectWin('');
            const testFile = phpUnitProjectWin('tests/AssertionsTest.php');
            const builder = givenBuilder(
                {
                    phpunit: phpUnitProjectWin('vendor/bin/phpunit'),
                },
                cwd,
            ).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                phpUnitProjectWin('vendor/bin/phpunit'),
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                phpUnitProjectWin('tests/AssertionsTest.php'),
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should keep repeated --group arguments (#432)', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
            }).setArguments('--group=command --group=use-db tests/DbCommandTest.php');

            const { args } = builder.build();
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--group=command',
                '--group=use-db',
                'tests/DbCommandTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should not let a flag from args swallow the test file', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
                args: ['--stop-on-failure'],
            }).setArguments('/a/FooTest.php');

            const { args } = builder.build();
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--stop-on-failure',
                '/a/FooTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should keep an args option value containing spaces as one argument', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
                args: ['--group=my group'],
            }).setArguments('/a/FooTest.php');

            const { args } = builder.build();
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--group=my group',
                '/a/FooTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should remove caml case parameters', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
                args: ['--repeat=2', '--order-by=random'],
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--repeat=2',
                '--order-by=random',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should not transform arguments prefixed with --no to boolean', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
                args: ['--no-coverage', '--no-logging'],
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--no-coverage',
                '--no-logging',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('set environment object', () => {
            const environment = {
                XDEBUG_MODE: 'coverage',
                MEMORY_LIMIT: '-1',
            };

            const builder = givenBuilder({ environment, phpunit: 'vendor/bin/phpunit' });

            const { runtime, args, options } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
            expect(options.cwd).toEqual(phpUnitProject(''));

            for (const [key, value] of Object.entries(environment)) {
                expect(
                    spawnSync('php', ['-r', `echo getenv('${key}');`], options).stdout.toString(),
                ).toEqual(value);
            }
        });

        it('artisan test', () => {
            const builder = givenBuilder({ phpunit: 'artisan test' });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['artisan', 'test', '--colors=always', '--teamcity']);
        });

        it('has single quote', () => {
            const filter = "^.*::(it has user's email)(( with (data set )?.*)?)?$";

            const cwd = phpUnitProject('');
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const builder = givenBuilder(
                {
                    phpunit: 'vendor/bin/pest',
                },
                cwd,
            ).setArguments(`${testFile} --filter="${filter}"`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/pest',
                `--filter=^.*::(it has user's email)(( with (data set )?.*)?)?$`,
                phpUnitProject('tests/AssertionsTest.php'),
                '--colors=always',
                '--teamcity',
            ]);
        });
        it('should handle php binary path with spaces', () => {
            const builder = givenBuilder({
                php: 'C:\\Program Files\\PHP\\php',
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('C:\\Program Files\\PHP\\php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
        });

        it('should handle phpunit binary path with spaces', () => {
            const cwd = 'd:\\All Project\\adminservice-collaboration';
            const builder = givenBuilder(
                {
                    phpunit: 'd:\\All Project\\adminservice-collaboration\\vendor\\bin\\phpunit',
                },
                cwd,
            );

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'd:\\All Project\\adminservice-collaboration\\vendor\\bin\\phpunit',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should handle paths with spaces', () => {
            const cwd = 'd:\\All Project\\adminservice-collaboration';
            const testFile = 'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php';
            const builder = givenBuilder(
                {
                    phpunit: 'vendor/bin/phpunit',
                },
                cwd,
            ).setArguments(`"${testFile}"`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('should handle paths with spaces and filter', () => {
            const cwd = 'd:\\All Project\\adminservice-collaboration';
            const testFile = 'd:\\All Project\\adminservice-collaboration\\tests\\AppTest.php';
            const builder = givenBuilder(
                {
                    phpunit: 'vendor/bin/phpunit',
                },
                cwd,
            ).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$' "${testFile}"`);

            const { runtime, args } = builder.build();
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

    describe('RemoteCommand', () => {
        const givenBuilder = (configuration: Record<string, unknown>, cwd?: string) => {
            const config = new Configuration({ php: 'php', ...configuration });
            const options = { cwd: cwd ?? phpUnitProject('') };
            const pathReplacer = new PathReplacer(
                options,
                config.get('paths') as Record<string, string>,
            );
            return new ProcessBuilder(config, options, pathReplacer);
        };

        it('run paratest with --functional', () => {
            const cwd = phpUnitProject('');
            const builder = givenBuilder({
                command: `docker run -i --rm -v ${VAR_PWD}:/app -w /app phpunit-stub`,
                phpunit: 'vendor/bin/paratest',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'run',
                '-i',
                '--rm',
                '-v',
                `${cwd}:/app`,
                '-w',
                '/app',
                'phpunit-stub',
                'php',
                'vendor/bin/paratest',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '--colors=always',
                '--teamcity',
                '--functional',
            ]);
        });

        it('docker with sh -c', () => {
            const builder = givenBuilder({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'vendor/bin/paratest',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                '/bin/sh',
                '-c',
                [
                    'php',
                    'vendor/bin/paratest',
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    `--colors=always`,
                    `--teamcity`,
                    `--functional`,
                ].join(' '),
            ]);
        });

        it('docker sh -c quotes an args option value containing spaces', () => {
            const builder = givenBuilder({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'vendor/bin/phpunit',
                args: ['--group=my group'],
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                '/bin/sh',
                '-c',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--group=my group'`,
                    '--colors=always',
                    '--teamcity',
                ].join(' '),
            ]);
        });

        it('docker sh -c with pest dataset filter containing apostrophe', () => {
            const filter =
                `--filter='/^.*::(it has user\\'s email` +
                ` with data set "\\(\\'other@example\\.com\\'\\)")$/'`;
            const testFile = '%2Fpest-stub%2Ftests%2FUnit%2FExampleTest.php';
            const builder = givenBuilder({
                command: 'docker exec -t vscode-phpunit /bin/sh -c',
                phpunit: 'vendor/bin/pest',
            }).setArguments(`${filter} ${testFile}`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');

            const shCmd = args[args.length - 1];
            expect(shCmd).toContain(
                `"--filter=/^.*::(it has user\\'s email` +
                    ` with data set \\"\\(\\'other@example\\.com\\'\\)\\")$/"`,
            );
            expect(shCmd).toContain('/pest-stub/tests/Unit/ExampleTest.php');
            expect(shCmd).toContain('--colors=always');
            expect(shCmd).toContain('--teamcity');
        });

        it(`should replace ${VAR_WORKSPACE_FOLDER}`, () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const builder = givenBuilder({
                command: 'docker exec --workdir=/var/www/ container_name',
                phpunit: 'vendor/bin/phpunit',
                paths: {
                    [VAR_WORKSPACE_FOLDER]: '/var/www',
                },
            }).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                'php',
                'vendor/bin/phpunit',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '/var/www/tests/AssertionsTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it(`should replace ${VAR_WORKSPACE_FOLDER} for Windows Path`, () => {
            const cwd = phpUnitProjectWin('');
            const testFile = phpUnitProjectWin('tests/AssertionsTest.php');
            const builder = givenBuilder(
                {
                    command: 'docker exec --workdir=/var/www/ container_name',
                    phpunit: 'vendor/bin/phpunit',
                    paths: {
                        [VAR_WORKSPACE_FOLDER]: '/var/www',
                    },
                },
                cwd,
            ).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                'php',
                'vendor/bin/phpunit',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '/var/www/tests/AssertionsTest.php',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it('docker with artisan test', () => {
            const builder = givenBuilder({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'artisan test',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                '/bin/sh',
                '-c',
                [
                    'php',
                    'artisan',
                    'test',
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    `--colors=always`,
                    `--teamcity`,
                ].join(' '),
            ]);
        });

        it('ssh', () => {
            const builder = givenBuilder({
                command:
                    'ssh -i dockerfiles/vscode-phpunit/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no cd /app;',
                phpunit: 'artisan test',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('ssh');
            expect(args).toEqual([
                '-i',
                'dockerfiles/vscode-phpunit/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                'cd',
                '/app;',
                [
                    'php',
                    'artisan',
                    'test',
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    '--colors=always',
                    '--teamcity',
                ].join(' '),
            ]);
        });
    });

    describe('phpunit.command has variable', () => {
        const givenBuilder = (configuration: Record<string, unknown>, cwd?: string) => {
            const config = new Configuration({
                command: CMD_TEMPLATE,
                php: 'php',
                ...configuration,
            });
            const options = { cwd: cwd ?? phpUnitProject('') };
            const pathReplacer = new PathReplacer(
                options,
                config.get('paths') as Record<string, string>,
            );
            return new ProcessBuilder(config, options, pathReplacer);
        };

        it(`command is ${CMD_TEMPLATE}`, () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
        });

        it(`command is ${CMD_TEMPLATE} --functional`, () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/paratest',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/paratest',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '--colors=always',
                '--teamcity',
                '--functional',
            ]);
        });

        it(`command is ${CMD_TEMPLATE} and phpunit is artisan test`, () => {
            const builder = givenBuilder({
                command: CMD_TEMPLATE,
                phpunit: 'artisan test',
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['artisan', 'test', '--colors=always', '--teamcity']);
        });

        it(`command is ${CMD_TEMPLATE} and environment`, () => {
            const builder = givenBuilder({
                command: `XDEBUG_MODE=coverage MEMORY_LIMIT=-1 ${CMD_TEMPLATE}`,
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('XDEBUG_MODE=coverage');
            expect(args).toEqual([
                'MEMORY_LIMIT=-1',
                'php',
                'vendor/bin/phpunit',
                '--colors=always',
                '--teamcity',
            ]);
        });

        it(`command is ${CMD_TEMPLATE} with ssh`, () => {
            const builder = givenBuilder({
                command: `ssh -i dockerfiles/vscode-phpunit/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no "cd /app; ${CMD_TEMPLATE}"`,
                phpunit: 'artisan test',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('ssh');
            expect(args).toEqual([
                '-i',
                'dockerfiles/vscode-phpunit/id_rsa',
                '-p',
                '2222',
                'root@localhost',
                '-o',
                'StrictHostKeyChecking=no',
                [
                    'cd',
                    '/app;',
                    'php',
                    'artisan',
                    'test',
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    `--colors=always`,
                    `--teamcity`,
                ].join(' '),
            ]);
        });

        it(`command is ${CMD_TEMPLATE} with docker`, () => {
            const builder = givenBuilder({
                command: `docker exec -t container_name /bin/sh -c '${CMD_TEMPLATE}'`,
                phpunit: 'vendor/bin/phpunit',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '-t',
                'container_name',
                '/bin/sh',
                '-c',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    '--colors=always',
                    '--teamcity',
                ].join(' '),
            ]);
        });
    });

    describe('assignCloverFile', () => {
        const givenCoverageBuilder = async (mode?: Mode, paths: Record<string, string> = {}) => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: '/local/workspace' };
            const pathReplacer = new PathReplacer(options, paths);
            const xdebug = mode ? await new Xdebug(config).setMode(mode) : undefined;
            return new ProcessBuilder(config, options, pathReplacer, xdebug);
        };

        it('setCloverFile / getCloverFile', async () => {
            const builder = (await givenCoverageBuilder(Mode.coverage)).withCoverageClover(
                '/workspace/.phpunit.cache/coverage-abc-0.xml',
            );

            expect(builder.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
        });

        it('getPhpUnitArgs returns empty when no clover file set', async () => {
            const { args } = (await givenCoverageBuilder(Mode.coverage)).build();

            expect(args).not.toContain('--coverage-clover');
        });

        it('getPhpUnitArgs returns --coverage-clover with local path', async () => {
            const { args } = (await givenCoverageBuilder(Mode.coverage))
                .withCoverageClover('/workspace/.phpunit.cache/coverage-abc-0.xml')
                .build();

            expect(args.slice(-2)).toEqual([
                '--coverage-clover',
                '/workspace/.phpunit.cache/coverage-abc-0.xml',
            ]);
        });

        it('getPhpUnitArgs applies pathReplacer.toRemote to clover path', async () => {
            const { args } = (
                await givenCoverageBuilder(Mode.coverage, { [VAR_WORKSPACE_FOLDER]: '/app' })
            )
                .withCoverageClover('/local/workspace/.phpunit.cache/coverage-abc-0.xml')
                .build();

            expect(args.slice(-2)).toEqual([
                '--coverage-clover',
                '/app/.phpunit.cache/coverage-abc-0.xml',
            ]);
        });

        it('clone preserves clover file', async () => {
            const builder = (await givenCoverageBuilder(Mode.coverage)).withCoverageClover(
                '/workspace/.phpunit.cache/coverage-abc-0.xml',
            );

            expect(builder.clone().getCloverFile()).toBe(
                '/workspace/.phpunit.cache/coverage-abc-0.xml',
            );
        });

        it('clone can be given a new clover file independently', async () => {
            const builder = (await givenCoverageBuilder(Mode.coverage)).withCoverageClover(
                '/workspace/.phpunit.cache/coverage-abc-0.xml',
            );

            const other = builder.withCoverageClover(
                '/workspace/.phpunit.cache/coverage-abc-1.xml',
            );

            expect(builder.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-0.xml');
            expect(other.getCloverFile()).toBe('/workspace/.phpunit.cache/coverage-abc-1.xml');
        });

        it('getPhpUnitArgs returns empty in debug mode', async () => {
            const { args } = (await givenCoverageBuilder(Mode.debug)).build();

            expect(args).not.toContain('--coverage-clover');
        });

        it('should return undefined when not in coverage mode', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const xdebug = new Xdebug(config);
            const builder = new ProcessBuilder(config, options, pathReplacer, xdebug);

            expect(builder.getCloverFile()).toBeUndefined();
        });

        it('should return undefined when no xdebug', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const builder = new ProcessBuilder(config, options, pathReplacer);

            expect(builder.getCloverFile()).toBeUndefined();
        });
    });

    describe('clone', () => {
        it('should clone without Xdebug when none is set', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const builder = new ProcessBuilder(config, options, pathReplacer);

            const cloned = builder.clone();

            expect(cloned.getXdebug()).toBeUndefined();
        });
    });
});
