import { describe, expect, it } from 'vitest';
import { givenCommand as givenSharedCommand } from '../../tests/support/testCommand';
import { CMD_TEMPLATE } from '../constants';

describe('TestCommand', () => {
    describe('phpunit.command with the command template variable', () => {
        const givenCommand = (configuration: Record<string, unknown>, cwd?: string) =>
            givenSharedCommand({ command: CMD_TEMPLATE, ...configuration }, cwd);

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
});
