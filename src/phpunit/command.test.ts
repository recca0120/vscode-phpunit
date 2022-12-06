import { describe, it } from '@jest/globals';
import { LocalCommand } from './command';
import { Configuration } from './configuration';

describe('Command Test', () => {
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
