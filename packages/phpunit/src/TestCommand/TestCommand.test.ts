import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { phpUnitProject, phpUnitProjectWin } from '../../tests/utils';
import { Configuration, PathReplacer } from '../Configuration';
import { CMD_TEMPLATE, VAR_PWD, VAR_WORKSPACE_FOLDER } from '../constants';
import { CoverageFiles } from '../TestCoverage';
import { TeamcityEvent, type TestFailed, toLocalResult } from '../TestOutput';
import { TestCommand } from './TestCommand';
import { Mode, Xdebug } from './Xdebug';

describe('TestCommand', () => {
    describe('LocalCommand', () => {
        const givenCommand = (configuration: Record<string, unknown>, cwd?: string) => {
            const config = new Configuration({ php: 'php', ...configuration });
            const options = { cwd: cwd ?? phpUnitProject('') };
            const pathReplacer = new PathReplacer(
                options,
                config.get('paths') as Record<string, string>,
            );
            return new TestCommand(config, options, pathReplacer);
        };

        it('paths returns PathReplacer instance', () => {
            const command = givenCommand({ phpunit: 'vendor/bin/phpunit' });

            expect(command.paths).toBeInstanceOf(PathReplacer);
        });

        it('run paratest with --functional and --filter', () => {
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

        it('should run Windows Path', () => {
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

        it('should keep repeated --group arguments (#432)', () => {
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

        it('should not let a flag from args swallow the test file', () => {
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

        it('should keep an args option value containing spaces as one argument', () => {
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

        it('should remove caml case parameters', () => {
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

        it('should not transform arguments prefixed with --no to boolean', () => {
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

        it('set environment object', () => {
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

        it('artisan test', () => {
            const command = givenCommand({ phpunit: 'artisan test' });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['artisan', 'test', '--colors=always', '--teamcity']);
        });

        it('has single quote', () => {
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
        it('should handle php binary path with spaces', () => {
            const command = givenCommand({
                php: 'C:\\Program Files\\PHP\\php',
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('C:\\Program Files\\PHP\\php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
        });

        it('should handle phpunit binary path with spaces', () => {
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

        it('should handle paths with spaces', () => {
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

        it('should handle paths with spaces and filter', () => {
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

    describe('RemoteCommand', () => {
        const givenCommand = (configuration: Record<string, unknown>, cwd?: string) => {
            const config = new Configuration({ php: 'php', ...configuration });
            const options = { cwd: cwd ?? phpUnitProject('') };
            const pathReplacer = new PathReplacer(
                options,
                config.get('paths') as Record<string, string>,
            );
            return new TestCommand(config, options, pathReplacer);
        };

        it('maps only whole path segments to the remote path', () => {
            const command = givenCommand(
                {
                    command: 'docker exec app',
                    phpunit: 'vendor/bin/phpunit',
                    paths: { '/Users/me/app': '/var/www' },
                },
                '/Users/me/app',
            ).withArguments(
                '/Users/me/app/tests/FooTest.php /Users/me/application/tests/BarTest.php',
            );

            expect(command.build().args).toEqual(
                expect.arrayContaining([
                    '/var/www/tests/FooTest.php',
                    '/Users/me/application/tests/BarTest.php',
                ]),
            );
        });

        it('maps only whole path segments back to the local path', () => {
            const command = givenCommand(
                { command: 'docker exec app', paths: { '/Users/me/app': '/var/www' } },
                '/Users/me/app',
            );

            const result = toLocalResult(
                {
                    event: TeamcityEvent.testFailed,
                    name: 'test_a',
                    flowId: 1,
                    id: 'Tests\\FooTest::test_a',
                    file: '/var/www/tests/FooTest.php',
                    locationHint: 'php_qn:///var/www/tests/FooTest.php::\\Tests\\FooTest::test_a',
                    message: '',
                    details: [
                        { file: '/var/www/tests/FooTest.php', line: 7 },
                        { file: '/var/www-shared/src/Helper.php', line: 3 },
                    ],
                    duration: 0,
                } as TestFailed,
                command.paths,
            );

            expect(result).toMatchObject({
                file: '/Users/me/app/tests/FooTest.php',
                details: [
                    { file: '/Users/me/app/tests/FooTest.php', line: 7 },
                    { file: '/var/www-shared/src/Helper.php', line: 3 },
                ],
            });
        });

        it('replaces the cwd variable in the command with the working directory', () => {
            const command = givenCommand(
                {
                    command: 'docker run --rm -v $' + '{cwd}:/app -w /app image',
                    phpunit: 'vendor/bin/phpunit',
                    paths: { ['$' + '{PWD}']: '/app' },
                },
                '/proj',
            );

            const { runtime, args } = command.build();

            expect([runtime, ...args].slice(0, 7)).toEqual([
                'docker',
                'run',
                '--rm',
                '-v',
                '/proj:/app',
                '-w',
                '/app',
            ]);
        });

        it('run paratest with --functional', () => {
            const cwd = phpUnitProject('');
            const command = givenCommand({
                command: `docker run -i --rm -v ${VAR_PWD}:/app -w /app phpunit-stub`,
                phpunit: 'vendor/bin/paratest',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'vendor/bin/paratest',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'vendor/bin/phpunit',
                args: ['--group=my group'],
            });

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: 'docker exec -t vscode-phpunit /bin/sh -c',
                phpunit: 'vendor/bin/pest',
            }).withArguments(`${filter} ${testFile}`);

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name',
                phpunit: 'vendor/bin/phpunit',
                paths: {
                    [VAR_WORKSPACE_FOLDER]: '/var/www',
                },
            }).withArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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
            const command = givenCommand(
                {
                    command: 'docker exec --workdir=/var/www/ container_name',
                    phpunit: 'vendor/bin/phpunit',
                    paths: {
                        [VAR_WORKSPACE_FOLDER]: '/var/www',
                    },
                },
                cwd,
            ).withArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'artisan test',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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

        it('ssh keeps a test file path with spaces as one remote argument', () => {
            const command = givenCommand(
                {
                    command: 'ssh user@host cd /app;',
                    phpunit: 'vendor/bin/phpunit',
                    paths: { '/proj': '/app' },
                },
                '/proj',
            ).withArguments('"/proj/tests/My Test.php"');

            const { args } = command.build();

            expect(args[args.length - 1]).toEqual(
                "php vendor/bin/phpunit '/app/tests/My Test.php' --colors=always --teamcity",
            );
        });

        it('ssh', () => {
            const command = givenCommand({
                command:
                    'ssh -i dockerfiles/vscode-phpunit/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no cd /app;',
                phpunit: 'artisan test',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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
        const givenCommand = (configuration: Record<string, unknown>, cwd?: string) => {
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
            return new TestCommand(config, options, pathReplacer);
        };

        it(`command is ${CMD_TEMPLATE}`, () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=always', '--teamcity']);
        });

        it(`command is ${CMD_TEMPLATE} --functional`, () => {
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

        it(`command is ${CMD_TEMPLATE} and phpunit is artisan test`, () => {
            const command = givenCommand({
                command: CMD_TEMPLATE,
                phpunit: 'artisan test',
            });

            const { runtime, args } = command.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['artisan', 'test', '--colors=always', '--teamcity']);
        });

        it(`command is ${CMD_TEMPLATE} and environment`, () => {
            const command = givenCommand({
                command: `XDEBUG_MODE=coverage MEMORY_LIMIT=-1 ${CMD_TEMPLATE}`,
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: `ssh -i dockerfiles/vscode-phpunit/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no "cd /app; ${CMD_TEMPLATE}"`,
                phpunit: 'artisan test',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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
            const command = givenCommand({
                command: `docker exec -t container_name /bin/sh -c '${CMD_TEMPLATE}'`,
                phpunit: 'vendor/bin/phpunit',
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = command.build();
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

    describe('coverage clover', () => {
        it('should set clover file on xdebug when in coverage mode', async () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const xdebug = await new Xdebug(config).setMode(Mode.coverage);
            const command = new TestCommand(config, options, pathReplacer, xdebug);

            const covered = command.withCoverageClover(new CoverageFiles(options.cwd).allocate(0));

            expect(covered.getCloverFile()).toMatch(/\.phpunit\.cache[/\\]coverage-.*-0\.xml$/);
        });

        it('should return undefined when not in coverage mode', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const xdebug = new Xdebug(config);
            const command = new TestCommand(config, options, pathReplacer, xdebug);

            expect(command.getCloverFile()).toBeUndefined();
        });

        it('should return undefined when no xdebug', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const command = new TestCommand(config, options, pathReplacer);

            expect(command.getCloverFile()).toBeUndefined();
        });
    });

    describe('withArguments', () => {
        it('should deep-copy Xdebug so the new command has independent Xdebug', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const xdebug = new Xdebug(config);
            const command = new TestCommand(config, options, pathReplacer, xdebug);

            const cloned = command.withArguments('');

            expect(cloned.getXdebug()).not.toBe(command.getXdebug());
        });

        it('should create the new command without Xdebug when none is set', () => {
            const config = new Configuration({ php: 'php', phpunit: 'vendor/bin/phpunit' });
            const options = { cwd: phpUnitProject('') };
            const pathReplacer = new PathReplacer(options, {});
            const command = new TestCommand(config, options, pathReplacer);

            const cloned = command.withArguments('');

            expect(cloned.getXdebug()).toBeUndefined();
        });
    });
});
