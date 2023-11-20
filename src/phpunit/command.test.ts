import 'jest';
import { LocalCommand, RemoteCommand } from './command';
import { Configuration } from './configuration';
import { phpUnitProject } from './__tests__/utils';

describe('Command Test', () => {
    const phpUnitProjectForWindows = (path: string) =>
        `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');

    describe('LocalCommand', () => {
        const givenCommand = (configuration: any, cwd?: string) => {
            return new LocalCommand(new Configuration({ php: 'php', ...configuration }), {
                cwd: cwd ?? phpUnitProject(''),
            });
        };

        it('should add -f when phpunit binary is paratest and has --filter', () => {
            const command = givenCommand({
                phpunit: 'vendor/bin/paratest',
            }).setArguments('--filter=\'^.*::(test_passed)( with data set .*)?$\'');

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

        it('should run Windows Path', () => {
            const cwd = phpUnitProjectForWindows('');
            const testFile = phpUnitProjectForWindows('tests/AssertionsTest.php');
            const command = givenCommand({
                phpunit: `${phpUnitProjectForWindows('vendor/bin/phpunit')}`,
            }, cwd).setArguments(`${testFile} --filter='^.*::(test_passed)( with data set .*)?$'`);

            const { cmd, args } = command.apply();
            expect(cmd).toEqual('php');
            expect(args).toEqual([
                `${phpUnitProjectForWindows('vendor/bin/phpunit')}`,
                `${phpUnitProjectForWindows('tests/AssertionsTest.php')}`,
                '--filter=^.*::(test_passed)( with data set .*)?$',
                '--teamcity',
                '--colors=never',
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
                '--repeat=2',
                '--order-by=random',
                '--teamcity',
                '--colors=never',
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
                '--no-coverage',
                '--no-logging',
                '--teamcity',
                '--colors=never',
            ]);
        });
    });

    describe('RemoteCommand', () => {
        const givenCommand = (configuration: any, cwd?: string) => {
            return new RemoteCommand(new Configuration({ php: 'php', ...configuration }), {
                cwd: cwd ?? phpUnitProject(''),
            });
        };

        it('should add -f when phpunit binary is paratest and has --filter', () => {
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
                'php vendor/bin/paratest \'--filter=^.*::(test_passed)( with data set .*)?$\' \'--teamcity\' \'--colors=never\' \'-f\'',
            ]);
        });

        it('should replace workspaceFolder', () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name bash -c',
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
                'bash',
                '-c',
                'php vendor/bin/phpunit /var/www/tests/AssertionsTest.php \'--filter=^.*::(test_passed)( with data set .*)?$\' \'--teamcity\' \'--colors=never\'',
            ]);
        });

        it('should replace workspaceFolder for Windows Path', () => {
            const cwd = phpUnitProjectForWindows('');
            const testFile = phpUnitProjectForWindows('tests/AssertionsTest.php');
            const command = givenCommand({
                command: 'docker exec --workdir=/var/www/ container_name bash -c',
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
                'bash',
                '-c',
                'php vendor/bin/phpunit /var/www/tests/AssertionsTest.php \'--filter=^.*::(test_passed)( with data set .*)?$\' \'--teamcity\' \'--colors=never\'',
            ]);
        });
    });
});
