import { describe, it } from '@jest/globals';
import { LocalCommand, RemoteCommand } from './command';
import { Configuration } from './configuration';
import { projectPath } from './__tests__/helper';

describe('Command Test', () => {
    describe('LocalCommand', () => {
        it('should add -f when phpunit binary is paratest and has --filter', () => {
            const configuration = new Configuration({
                php: 'php',
                phpunit: 'vendor/bin/paratest',
            });
            const command = new LocalCommand(configuration);
            command.setArguments("--filter='^.*::(test_passed)( with data set .*)?$'");

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/paratest',
                '--filter=^.*::(test_passed)( with data set .*)?$',
                '--teamcity',
                '--colors=never',
                '-f',
            ]);
        });
    });

    describe('RemoteCommand', () => {
        it('should add -f when phpunit binary is paratest and has --filter', () => {
            const cwd = projectPath('');
            const configuration = new Configuration({
                command: 'docker run -i --rm -v ${PWD}:/app -w /app project-stub-phpunit',
                php: 'php',
                phpunit: 'vendor/bin/paratest',
            });
            const command = new RemoteCommand(configuration, { cwd: cwd });

            command.setArguments("--filter='^.*::(test_passed)( with data set .*)?$'");

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('docker');
            expect(args).toEqual([
                'run',
                '-i',
                '--rm',
                '-v',
                `${cwd}:/app`,
                '-w',
                '/app',
                'project-stub-phpunit',
                "php vendor/bin/paratest '--filter=^.*::(test_passed)( with data set .*)?$' '--teamcity' '--colors=never' '-f'",
            ]);
        });
        it('should replace workspaceFolder', () => {
            const cwd = projectPath('');
            const configuration = new Configuration({
                command: 'docker exec --workdir=/var/www/ container_name bash -c',
                php: 'php',
                phpunit: 'vendor/bin/phpunit',
                paths: {
                    '${workspaceFolder}': '/var/www',
                },
            });
            const command = new RemoteCommand(configuration, { cwd: cwd });

            command.setArguments(
                `${projectPath(
                    'tests/AssertionsTest.php'
                )} --filter='^.*::(test_passed)( with data set .*)?$'`
            );

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                'bash',
                '-c',
                "php vendor/bin/phpunit /var/www/tests/AssertionsTest.php '--filter=^.*::(test_passed)( with data set .*)?$' '--teamcity' '--colors=never'",
            ]);
        });
    });
});
