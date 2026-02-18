import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { phpUnitProject, phpUnitProjectWin } from '../__tests__/utils';
import { Configuration } from '../Configuration';
import { ProcessBuilder } from './ProcessBuilder';
import { CMD_TEMPLATE, VAR_PWD, VAR_WORKSPACE_FOLDER } from './placeholders';

describe('ProcessBuilder Test', () => {
    describe('LocalCommand', () => {
        const givenBuilder = (configuration: Record<string, unknown>, cwd?: string) => {
            return new ProcessBuilder(new Configuration({ php: 'php', ...configuration }), {
                cwd: cwd ?? phpUnitProject(''),
            });
        };

        it('run paratest with --functional and --filter', () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/paratest',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/paratest',
                `--filter=^.*::(test_passed)( with data set .*)?$`,
                '--colors=never',
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
                '--colors=never',
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
                '--colors=never',
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
                '--colors=never',
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
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=never', '--teamcity']);
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
            expect(args).toEqual(['artisan', 'test', '--colors=never', '--teamcity']);
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
                '--colors=never',
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
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=never', '--teamcity']);
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
                '--colors=never',
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
                '--colors=never',
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
                '--colors=never',
                '--teamcity',
            ]);
        });
    });

    describe('RemoteCommand', () => {
        const givenBuilder = (configuration: Record<string, unknown>, cwd?: string) => {
            return new ProcessBuilder(new Configuration({ php: 'php', ...configuration }), {
                cwd: cwd ?? phpUnitProject(''),
            });
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
                '--colors=never',
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
                    `--colors=never`,
                    `--teamcity`,
                    `--functional`,
                ].join(' '),
            ]);
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
                '--colors=never',
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
                '--colors=never',
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
                    `--colors=never`,
                    `--teamcity`,
                ].join(' '),
            ]);
        });

        it('ssh', () => {
            const builder = givenBuilder({
                command:
                    'ssh -i dockerfiles/pest/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no cd /app;',
                phpunit: 'artisan test',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('ssh');
            expect(args).toEqual([
                '-i',
                'dockerfiles/pest/id_rsa',
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
                    '--colors=never',
                    '--teamcity',
                ].join(' '),
            ]);
        });
    });

    describe('phpunit.command has variable', () => {
        const givenBuilder = (configuration: Record<string, unknown>, cwd?: string) => {
            return new ProcessBuilder(
                new Configuration({
                    command: CMD_TEMPLATE,
                    php: 'php',
                    ...configuration,
                }),
                { cwd: cwd ?? phpUnitProject('') },
            );
        };

        it(`command is ${CMD_TEMPLATE}`, () => {
            const builder = givenBuilder({
                phpunit: 'vendor/bin/phpunit',
            });

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('php');
            expect(args).toEqual(['vendor/bin/phpunit', '--colors=never', '--teamcity']);
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
                '--colors=never',
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
            expect(args).toEqual(['artisan', 'test', '--colors=never', '--teamcity']);
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
                '--colors=never',
                '--teamcity',
            ]);
        });

        it(`command is ${CMD_TEMPLATE} with ssh`, () => {
            const builder = givenBuilder({
                command: `ssh -i dockerfiles/pest/id_rsa -p 2222 root@localhost -o StrictHostKeyChecking=no "cd /app; ${CMD_TEMPLATE}"`,
                phpunit: 'artisan test',
            }).setArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { runtime, args } = builder.build();
            expect(runtime).toEqual('ssh');
            expect(args).toEqual([
                '-i',
                'dockerfiles/pest/id_rsa',
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
                    `--colors=never`,
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
                    '--colors=never',
                    '--teamcity',
                ].join(' '),
            ]);
        });
    });
});
