import 'jest';
import { phpUnitProject } from '../__tests__/utils';
import { Configuration } from '../Configuration';
import { Command } from './Command';

describe('Command Test', () => {
    const phpUnitProjectForWindows = (path: string) =>
        `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');

    describe('LocalCommand', () => {
        const givenCommand = (configuration: any, cwd?: string) => {
            return new Command(new Configuration({ php: 'php', ...configuration }), {
                cwd: cwd ?? phpUnitProject(''),
            });
        };

        it('should add -f when PHPUnit binary is paratest and has --filter', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/paratest',
            }).setArguments('--filter=\'^.*::(test_passed)( with data set .*)?$\'');

            const { cmd, args } = command.apply();

            expect(cmd).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/paratest',
                '--filter=^.*::(test_passed)( with data set .*)?$',
                '--colors=never',
                '--teamcity',
                '-f',
            ]);
        });

        it('should run Windows Path', () => {
            const cwd = phpUnitProjectForWindows('');
            const testFile = phpUnitProjectForWindows('tests/AssertionsTest.php');
            const command = givenCommand({
                phpunit: phpUnitProjectForWindows('vendor/bin/phpunit'),
            }, cwd).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('php');
            expect(args).toEqual([
                phpUnitProjectForWindows('vendor/bin/phpunit'),
                '--filter=^.*::(test_passed)( with data set .*)?$',
                phpUnitProjectForWindows('tests/AssertionsTest.php'),
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('should remove caml case parameters', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
                args: ['--repeat=2', '--order-by=random'],
            });

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--order-by=random',
                '--repeat=2',
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('should not transform arguments prefixed with --no to boolean', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/phpunit',
                args: ['--no-coverage', '--no-logging'],
            });

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('php');
            expect(args).toEqual([
                'vendor/bin/phpunit',
                '--no-logging',
                '--no-coverage',
                '--colors=never',
                '--teamcity',
            ]);
        });
    });

    describe('RemoteCommand', () => {
        const givenCommand = (configuration: any, cwd?: string) => {
            return new Command(new Configuration({ php: 'php', ...configuration }), {
                cwd: cwd ?? phpUnitProject(''),
            });
        };

        it('should add -f when PHPUnit binary is paratest and has --filter', () => {
            const cwd = phpUnitProject('');
            const command = givenCommand({
                command: 'docker run -i --rm -v ${PWD}:/app -w /app phpunit-stub',
                phpunit: 'vendor/bin/paratest',
            }).setArguments('--filter=\'^.*::(test_passed)( with data set .*)?$\'');

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
                'phpunit-stub',
                'php',
                'vendor/bin/paratest',
                '--filter=^.*::(test_passed)( with data set .*)?$',
                '--colors=never',
                '--teamcity',
                '-f',
            ]);
        });

        it('docker with sh -c', () => {
            const cwd = phpUnitProject('');
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name /bin/sh -c',
                phpunit: 'vendor/bin/paratest',
            }).setArguments('--filter=\'^.*::(test_passed)( with data set .*)?$\'');

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('docker');
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
                    `'--colors=never'`,
                    `'--teamcity'`,
                    `'-f'`,
                ].join(' '),
            ]);
        });

        it('should replace workspaceFolder', () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name',
                phpunit: 'vendor/bin/phpunit',
                paths: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    '${workspaceFolder}': '/var/www',
                },
            }).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                'php',
                'vendor/bin/phpunit',
                '--filter=^.*::(test_passed)( with data set .*)?$',
                '/var/www/tests/AssertionsTest.php',
                '--colors=never',
                '--teamcity',
            ]);
        });

        it('should replace workspaceFolder for Windows Path', () => {
            const cwd = phpUnitProjectForWindows('');
            const testFile = phpUnitProjectForWindows('tests/AssertionsTest.php');
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name',
                phpunit: 'vendor/bin/phpunit',
                paths: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    '${workspaceFolder}': '/var/www',
                },
            }, cwd).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('docker');
            expect(args).toEqual([
                'exec',
                '--workdir=/var/www/',
                'container_name',
                'php',
                'vendor/bin/phpunit',
                '--filter=^.*::(test_passed)( with data set .*)?$',
                '/var/www/tests/AssertionsTest.php',
                '--colors=never',
                '--teamcity',
            ]);
        });
    });
});
