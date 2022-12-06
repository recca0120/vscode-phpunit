import { describe, it } from '@jest/globals';
import { LocalCommand, RemoteCommand } from './command';
import { Configuration } from './configuration';

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
                '-f',
                '--teamcity',
                '--colors=never',
            ]);
        });
    });

    describe('RemoteCommand', () => {
        it('should add -f when phpunit binary is paratest and has --filter', () => {
            const configuration = new Configuration({
                command: 'docker run -i --rm -v ${PWD}:/app -w /app project-stub-phpunit',
                php: 'php',
                phpunit: 'vendor/bin/paratest',
            });
            const command = new RemoteCommand(configuration);
            command.setArguments("--filter='^.*::(test_passed)( with data set .*)?$'");

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('docker');
            expect(args).toEqual([
                'run',
                '-i',
                '--rm',
                '-v',
                'undefined:/app',
                '-w',
                '/app',
                'project-stub-phpunit',
                "php vendor/bin/paratest '--filter=^.*::(test_passed)( with data set .*)?$' '-f' '--teamcity' '--colors=never'",
            ]);
        });
    });
});
