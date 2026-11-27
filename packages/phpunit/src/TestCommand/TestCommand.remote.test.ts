import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { givenCommand } from '../../tests/support/testCommand';
import { phpUnitProjectWin } from '../../tests/support/windowsPath';
import { VAR_PWD, VAR_WORKSPACE_FOLDER } from '../constants';

describe('TestCommand', () => {
    describe('running through docker or ssh', () => {
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

        it('adds --functional to a paratest run in docker', () => {
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

        it('runs through docker with sh -c', () => {
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

        it('renders every --filter for docker sh -c when phpunit.args already has one', () => {
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'vendor/bin/phpunit',
                args: ['--filter=test_failed'],
            }).withArguments(`--filter='^.*::(test_passed)( with data set .*)?$'`);

            const { args } = command.build();
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                '/bin/sh',
                '-c',
                [
                    'php',
                    'vendor/bin/phpunit',
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    `'--filter=^.*::(test_passed)( with data set .*)?$'`,
                    `--colors=always`,
                    `--teamcity`,
                ].join(' '),
            ]);
        });

        it('quotes an args option value containing spaces for docker sh -c', () => {
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

        it('keeps an apostrophe in a Pest dataset filter for docker sh -c', () => {
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

        it(`replaces ${VAR_WORKSPACE_FOLDER}`, () => {
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

        it(`replaces ${VAR_WORKSPACE_FOLDER} with a Windows path`, () => {
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

        it("splits an 'artisan test' binary inside docker", () => {
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

        it('runs through ssh with the command as one remote argument', () => {
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
});
